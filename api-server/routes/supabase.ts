import { Router } from "express";

const router = Router();

async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const pat = process.env.SUPABASE_PAT ?? "";
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (!pat || !supabaseUrl) return { ok: false, error: "Missing SUPABASE_PAT or SUPABASE_URL" };

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (resp.status === 201 || resp.ok) return { ok: true };
  const text = await resp.text();
  return { ok: false, error: `${resp.status}: ${text}` };
}

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key, ok: !!url && !!key };
}

// POST /api/supabase/setup
router.post("/supabase/setup", async (_req, res) => {
  const result = await runSQL(`
    CREATE TABLE IF NOT EXISTS pharmacy_settings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      latitude DECIMAL(10, 8) NOT NULL DEFAULT 0,
      longitude DECIMAL(11, 8) NOT NULL DEFAULT 0,
      delivery_radius_km DECIMAL(8, 2) NOT NULL DEFAULT 5.0,
      max_requests_per_ip_per_day INTEGER NOT NULL DEFAULT 100,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';
    DROP TRIGGER IF EXISTS trg_pharmacy_settings_updated_at ON pharmacy_settings;
    CREATE TRIGGER trg_pharmacy_settings_updated_at
      BEFORE UPDATE ON pharmacy_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    GRANT ALL ON public.pharmacy_settings TO service_role, anon, authenticated;
    ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_all" ON public.pharmacy_settings;
    CREATE POLICY "service_role_all" ON public.pharmacy_settings
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    INSERT INTO pharmacy_settings (latitude, longitude, delivery_radius_km, max_requests_per_ip_per_day)
    SELECT 0, 0, 5.0, 100 WHERE NOT EXISTS (SELECT 1 FROM pharmacy_settings);
  `);

  if (!result.ok) { res.status(500).json({ error: result.error }); return; }
  res.json({ success: true });
});

// GET /api/supabase/settings
router.get("/supabase/settings", async (_req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }

  const resp = await fetch(`${url}/rest/v1/pharmacy_settings?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

// PATCH /api/supabase/settings/:id
router.patch("/supabase/settings/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }

  const { id } = req.params;
  const allowed = ["latitude", "longitude", "delivery_radius_km", "max_requests_per_ip_per_day"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k];
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const resp = await fetch(
    `${url}/rest/v1/pharmacy_settings?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    }
  );
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

export default router;
