import type { VercelRequest, VercelResponse } from "@vercel/node";

  function supabase() {
    const url = process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    return { url, key, ok: !!url && !!key };
  }

  export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.status(200).end(); return; }

    const { url, key, ok } = supabase();
    if (!ok) return res.status(500).json({ error: "Missing env vars" });

    const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    // ── GET: list orders ────────────────────────────────────────────────
    if (req.method === "GET") {
      const status = req.query.status as string | undefined;
      let query = `${url}/rest/v1/orders?select=*&order=created_at.desc`;
      if (status && status !== "all") query += `&status=eq.${encodeURIComponent(status)}`;
      const resp = await fetch(query, { headers: h });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json({ success: true, data });
    }

    // ── POST: create order ──────────────────────────────────────────────
    if (req.method === "POST") {
      const {
        phone, first_name, last_name, full_name,
        items, total_amount, status, address,
        comment, payment_method, call_id,
      } = req.body ?? {};

      if (!phone) return res.status(400).json({ error: "phone is required" });

      const body: Record<string, unknown> = {
        phone, first_name, last_name, full_name,
        items, total_amount,
        status: status ?? "new",
        address, comment, payment_method,
      };
      if (call_id) body.call_id = call_id;

      const resp = await fetch(`${url}/rest/v1/orders`, {
        method: "POST",
        headers: { ...h, Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.status(201).json({ success: true, data: Array.isArray(data) ? data[0] : data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  }
  