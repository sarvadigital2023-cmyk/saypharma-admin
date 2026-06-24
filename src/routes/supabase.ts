import { Router } from "express";

const router = Router();

function supabaseHeaders() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key, ok: !!url && !!key };
}

// ── Settings ────────────────────────────────────────────────────────────────

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

router.patch("/supabase/settings/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const { id } = req.params;
  const allowed = ["latitude", "longitude", "delivery_radius_km", "max_requests_per_ip_per_day",
    "delivery_fee", "min_order_amount", "working_hours", "currency"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }
  const resp = await fetch(`${url}/rest/v1/pharmacy_settings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

// ── Products ────────────────────────────────────────────────────────────────

router.get("/supabase/products", async (_req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const resp = await fetch(`${url}/rest/v1/products?select=*&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

router.post("/supabase/products", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const allowed = ["name", "price", "active_substance", "form", "country", "age_category",
    "prescription_required", "dosage", "side_effects", "description", "image_url"];
  const body: Record<string, unknown> = {};
  for (const k of allowed) { if (k in req.body) body[k] = req.body[k]; }
  if (!body.name) { res.status(400).json({ error: "name is required" }); return; }
  const resp = await fetch(`${url}/rest/v1/products`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.status(201).json({ success: true, data });
});

router.patch("/supabase/products/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const { id } = req.params;
  const allowed = ["name", "price", "active_substance", "form", "country", "age_category",
    "prescription_required", "dosage", "side_effects", "description", "image_url"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }
  const resp = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

router.delete("/supabase/products/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const { id } = req.params;
  const resp = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true });
});

// ── Stock Movements ─────────────────────────────────────────────────────────

router.get("/supabase/stock-movements", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }

  const typeFilter = req.query.type as string | undefined;
  let query = `${url}/rest/v1/stock_movements?select=*,products(id,name,form)&order=operation_date.desc`;
  if (typeFilter && ["in", "out", "write_off"].includes(typeFilter)) {
    query += `&type=eq.${typeFilter}`;
  }

  const resp = await fetch(query, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

router.post("/supabase/stock-movements", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }

  const allowed = ["product_id", "type", "quantity", "purchase_price",
    "purchase_price_vat", "expiry_date", "operation_date", "notes"];
  const body: Record<string, unknown> = {};
  for (const k of allowed) { if (k in req.body && req.body[k] !== "") body[k] = req.body[k]; }

  if (!body.product_id) { res.status(400).json({ error: "product_id is required" }); return; }
  if (!body.type || !["in", "out", "write_off"].includes(body.type as string)) {
    res.status(400).json({ error: "type must be in | out | write_off" }); return;
  }
  if (!body.quantity || Number(body.quantity) <= 0) {
    res.status(400).json({ error: "quantity must be > 0" }); return;
  }

  const resp = await fetch(`${url}/rest/v1/stock_movements`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.status(201).json({ success: true, data });
});

router.delete("/supabase/stock-movements/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const { id } = req.params;
  const resp = await fetch(`${url}/rest/v1/stock_movements?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true });
});

// GET /api/supabase/stock-balance
router.get("/supabase/stock-balance", async (_req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const resp = await fetch(
    `${url}/rest/v1/stock_balance?select=*&order=name.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

// ── Reports ─────────────────────────────────────────────────────────────────

router.get("/supabase/stock-report", async (_req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const resp = await fetch(
    `${url}/rest/v1/stock_report?select=*&order=name.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

// ── Orders ──────────────────────────────────────────────────────────────────

router.get("/supabase/orders", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const status = req.query.status as string | undefined;
  let query = `${url}/rest/v1/orders?select=*&order=created_at.desc`;
  if (status && status !== "all") query += `&status=eq.${encodeURIComponent(status)}`;
  const resp = await fetch(query, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

router.patch("/supabase/orders/:id", async (req, res) => {
  const { url, key, ok } = supabaseHeaders();
  if (!ok) { res.status(500).json({ error: "Missing env vars" }); return; }
  const { id } = req.params;
  const allowed = ["status", "comment", "address", "payment_method"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) { if (k in req.body) patch[k] = req.body[k]; }
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }
  const resp = await fetch(`${url}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  const data = await resp.json();
  if (!resp.ok) { res.status(resp.status).json({ error: data }); return; }
  res.json({ success: true, data });
});

export default router;
