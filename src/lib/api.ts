export const API_BASE = "/api";

export interface PharmacySettings {
  id: string;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  max_requests_per_ip_per_day: number;
  created_at: string;
  updated_at: string;
}

export async function getSettings(): Promise<PharmacySettings> {
  const resp = await fetch(`${API_BASE}/supabase/settings`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  const { data } = await resp.json();
  if (!data || data.length === 0) throw new Error("Нет данных в таблице pharmacy_settings");
  return data[0];
}

export async function updateSettings(
  id: string,
  patch: Partial<Omit<PharmacySettings, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const resp = await fetch(`${API_BASE}/supabase/settings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
}
