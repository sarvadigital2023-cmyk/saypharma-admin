export const API_BASE = "/api";

// ── Settings ──────────────────────────────────────────────────────────────

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
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  if (!data || data.length === 0) throw new Error("Нет данных в таблице pharmacy_settings");
  return data[0];
}

export async function updateSettings(
  id: string,
  patch: Partial<Omit<PharmacySettings, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const resp = await fetch(`${API_BASE}/supabase/settings/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
}

// ── Products ──────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  active_substance: string | null;
  form: string | null;
  country: string | null;
  age_category: string | null;
  prescription_required: boolean;
  dosage: string | null;
  side_effects: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type NewProduct = Omit<Product, "id" | "created_at" | "updated_at">;

export async function getProducts(): Promise<Product[]> {
  const resp = await fetch(`${API_BASE}/supabase/products`);
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return data ?? [];
}

export async function createProduct(product: NewProduct): Promise<Product> {
  const resp = await fetch(`${API_BASE}/supabase/products`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product),
  });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteProduct(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/supabase/products/${id}`, { method: "DELETE" });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
}

// ── Stock Movements ───────────────────────────────────────────────────────

export type MovementType = "in" | "out" | "write_off";

export interface StockMovement {
  id: string;
  product_id: string;
  products: { id: string; name: string; form: string | null } | null;
  type: MovementType;
  quantity: number;
  purchase_price: number | null;
  purchase_price_vat: number | null;
  expiry_date: string | null;
  operation_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewStockMovement = {
  product_id: string;
  type: MovementType;
  quantity: number;
  purchase_price?: number | null;
  purchase_price_vat?: number | null;
  expiry_date?: string | null;
  operation_date?: string;
  notes?: string | null;
};

export async function getStockMovements(type?: MovementType | "all"): Promise<StockMovement[]> {
  const qs = type && type !== "all" ? `?type=${type}` : "";
  const resp = await fetch(`${API_BASE}/supabase/stock-movements${qs}`);
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return data ?? [];
}

export async function createStockMovement(mv: NewStockMovement): Promise<StockMovement> {
  const resp = await fetch(`${API_BASE}/supabase/stock-movements`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mv),
  });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteStockMovement(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/supabase/stock-movements/${id}`, { method: "DELETE" });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
}

// ── Stock Balance ─────────────────────────────────────────────────────────

export interface StockBalance {
  product_id: string;
  name: string;
  form: string | null;
  active_substance: string | null;
  applicability: string | null;
  current_quantity: number;
  expiry_date: string | null;
}

export async function getStockBalance(): Promise<StockBalance[]> {
  const resp = await fetch(`${API_BASE}/supabase/stock-balance`);
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return data ?? [];
}

// ── Orders ────────────────────────────────────────────────────────────────

export type OrderStatus = "new" | "accepted" | "prepared" | "in_delivery" | "delivered" | "cancelled";

export interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
}

export interface Order {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  items: OrderItem[];
  total_amount: number | null;
  status: OrderStatus;
  address: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
  const qs = status ? `?status=${status}` : "";
  const resp = await fetch(`${API_BASE}/supabase/orders${qs}`);
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return data ?? [];
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const resp = await fetch(`${API_BASE}/supabase/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
}

// ── Stock Report ──────────────────────────────────────────────────────────

export interface StockReportRow {
  product_id: string;
  name: string;
  form: string | null;
  active_substance: string | null;
  prescription_required: boolean;
  applicability: string | null;
  current_quantity: number;
  price_without_vat: number | null;
  price_with_vat: number | null;
  expiry_date: string | null;
  last_received_date: string | null;
}

export async function getStockReport(): Promise<StockReportRow[]> {
  const resp = await fetch(`${API_BASE}/supabase/stock-report`);
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `HTTP ${resp.status}`); }
  const { data } = await resp.json();
  return data ?? [];
}
