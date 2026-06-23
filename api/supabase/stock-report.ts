import type { VercelRequest, VercelResponse } from "@vercel/node";

function headers() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key, ok: !!url && !!key };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { url, key, ok } = headers();
  if (!ok) return res.status(500).json({ error: "Missing env vars" });
  const resp = await fetch(`${url}/rest/v1/stock_report?select=*&order=name.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json({ error: data });
  return res.json({ success: true, data });
}
