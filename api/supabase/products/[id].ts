import type { VercelRequest, VercelResponse } from "@vercel/node";

function headers() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key, ok: !!url && !!key };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, key, ok } = headers();
  if (!ok) return res.status(500).json({ error: "Missing env vars" });

  const id = req.query.id as string;

  if (req.method === "PATCH") {
    const allowed = [
      "name", "price", "active_substance", "form", "country",
      "age_category", "prescription_required", "dosage",
      "side_effects", "description", "image_url",
    ];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in (req.body ?? {})) patch[k] = req.body[k];
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "No valid fields" });
    }

    const resp = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
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
    if (!resp.ok) return res.status(resp.status).json({ error: data });
    return res.json({ success: true, data });
  }

  if (req.method === "DELETE") {
    const resp = await fetch(
      `${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    );
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ error: data });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
