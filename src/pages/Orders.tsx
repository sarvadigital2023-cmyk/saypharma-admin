import { useState, useCallback, useEffect } from "react";
import { getOrders, updateOrderStatus, type Order, type OrderStatus } from "@/lib/api";

const STATUS_LABELS: Record<OrderStatus, string> = {
  new:         "Новый",
  accepted:    "Принят",
  prepared:    "Готовится",
  in_delivery: "Доставляется",
  delivered:   "Доставлен",
  cancelled:   "Отменён",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  new:         "bg-blue-500/15 text-blue-400 border-blue-500/30",
  accepted:    "bg-violet-500/15 text-violet-400 border-violet-500/30",
  prepared:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  in_delivery: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  delivered:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled:   "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  new:         ["accepted", "cancelled"],
  accepted:    ["prepared", "cancelled"],
  prepared:    ["in_delivery", "cancelled"],
  in_delivery: ["delivered", "cancelled"],
  delivered:   [],
  cancelled:   [],
};

type FilterTab = "all" | OrderStatus;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",         label: "Все" },
  { id: "new",         label: "Новые" },
  { id: "accepted",    label: "Принятые" },
  { id: "prepared",    label: "Готовятся" },
  { id: "in_delivery", label: "Доставка" },
  { id: "delivered",   label: "Доставлен" },
  { id: "cancelled",   label: "Отменён" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, s: OrderStatus) => Promise<void> }) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const next = NEXT_STATUSES[order.status];

  const change = async (s: OrderStatus) => {
    setSaving(true);
    await onStatusChange(order.id, s);
    setSaving(false);
    setOpen(false);
  };

  const clientName = order.full_name || [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const items: { name?: string; quantity?: number; price?: number }[] =
    Array.isArray(order.items) ? order.items : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 pt-4 pb-3 flex items-start gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            <span className="text-slate-500 text-xs">{formatDate(order.created_at)}</span>
          </div>
          <p className="text-white font-medium text-sm truncate">{clientName}</p>
          <p className="text-slate-400 text-xs mt-0.5">{order.phone}</p>
          {order.address && (
            <p className="text-slate-500 text-xs mt-0.5 truncate">📍 {order.address}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {order.total_amount != null && (
            <p className="text-emerald-400 font-semibold text-sm">
              {Number(order.total_amount).toLocaleString("ru-RU")} ₸
            </p>
          )}
          <svg className={`w-4 h-4 text-slate-600 mt-1 ml-auto transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {/* Items */}
          {items.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Состав заказа</p>
              <div className="space-y-1.5">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 text-sm">{it.name || "Товар"}</span>
                    <span className="text-slate-500 text-xs shrink-0">
                      {it.quantity != null ? `× ${it.quantity}` : ""}
                      {it.price != null ? `  ${Number(it.price).toLocaleString("ru-RU")} ₸` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          {order.comment && (
            <div>
              <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">Комментарий</p>
              <p className="text-slate-300 text-sm">{order.comment}</p>
            </div>
          )}

          {/* Status actions */}
          {next.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Изменить статус</p>
              <div className="flex flex-wrap gap-2">
                {next.map(s => (
                  <button
                    key={s}
                    onClick={() => change(s)}
                    disabled={saving}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-opacity disabled:opacity-50 ${
                      s === "cancelled"
                        ? "bg-red-500/10 text-red-400 border-red-500/30 active:opacity-70"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 active:opacity-70"
                    }`}
                  >
                    {saving ? "…" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const [tab, setTab]       = useState<FilterTab>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async (filter: FilterTab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders(filter === "all" ? undefined : filter);
      setOrders(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [load, tab]);

  const switchTab = (t: FilterTab) => { setTab(t); load(t); };

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    await load(tab);
  };

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Header */}
      <header className="pt-safe border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-xs font-bold">S</span>
            </div>
            <span className="text-white font-semibold text-sm">Заказы</span>
          </div>
          <button
            onClick={() => load(tab)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800/60 text-slate-500 border border-transparent hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => load(tab)} className="mt-2 text-xs text-slate-400 underline">Повторить</button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">Заказов пока нет</p>
          </div>
        )}

        {!loading && !error && orders.map(o => (
          <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange} />
        ))}
      </main>
    </div>
  );
}
