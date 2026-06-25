import { useState, useCallback, useEffect } from "react";
import {
  getOrders, updateOrderStatus, updateOrderPayment, deleteOrder,
  createStockMovement,
  type Order, type OrderStatus,
} from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";

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

const PAYMENT_METHODS = [
  { value: "cash",   label: "Наличные" },
  { value: "card",   label: "Карта" },
  { value: "online", label: "Онлайн" },
  { value: "kaspi",  label: "Kaspi" },
];

function paymentLabel(v: string | null) {
  if (!v) return null;
  return PAYMENT_METHODS.find(m => m.value === v)?.label ?? v;
}

function OrderCard({ order, sym, onStatusChange, onPaymentChange, onDelete }: {
  order: Order;
  sym: string;
  onStatusChange: (id: string, s: OrderStatus) => Promise<void>;
  onPaymentChange: (id: string, p: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen]             = useState(false);
  const [saving, setSaving]         = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const next = NEXT_STATUSES[order.status];

  const change = async (s: OrderStatus) => {
    setSaving(true);
    await onStatusChange(order.id, s);
    setSaving(false);
    setOpen(false);
  };

  const changePayment = async (p: string) => {
    setSavingPayment(true);
    await onPaymentChange(order.id, p);
    setSavingPayment(false);
  };

  const handleDelete = async () => {
    if (!confirm("Удалить заказ? Это действие нельзя отменить.")) return;
    setDeleting(true);
    await onDelete(order.id);
    setDeleting(false);
  };

  const clientName = order.full_name || [order.first_name, order.last_name].filter(Boolean).join(" ") || "—";
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 text-left"
        >
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
          {order.payment_method && (
            <p className="text-slate-500 text-xs mt-0.5">💳 {paymentLabel(order.payment_method)}</p>
          )}
        </button>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {order.total_amount != null && (
            <p className="text-emerald-400 font-semibold text-sm">
              {Number(order.total_amount).toLocaleString("ru-RU")} {sym}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            {/* Удалить */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Удалить заказ"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 active:opacity-70 transition-colors disabled:opacity-40"
            >
              {deleting
                ? <div className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
              }
            </button>
            {/* Развернуть */}
            <button onClick={() => setOpen(o => !o)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-400 transition-colors">
              <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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
                      {it.price != null ? `  ${Number(it.price).toLocaleString("ru-RU")} ${sym}` : ""}
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

          {/* Payment method */}
          <div>
            <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Способ оплаты</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => changePayment(m.value)}
                  disabled={savingPayment}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-50 ${
                    order.payment_method === m.value
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 active:opacity-70"
                  }`}
                >
                  {savingPayment && order.payment_method === m.value ? "…" : m.label}
                </button>
              ))}
            </div>
          </div>

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
  const { sym } = useCurrency();
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

    // При отмене — возвращаем товары на склад
    if (status === "cancelled") {
      const order = orders.find(o => o.id === id);
      if (order) {
        const items = Array.isArray(order.items) ? order.items : [];
        const now = new Date().toISOString();
        await Promise.allSettled(
          items
            .filter(it => it.product_id && it.quantity && it.quantity > 0)
            .map(it =>
              createStockMovement({
                product_id: it.product_id!,
                type: "return",
                quantity: it.quantity!,
                operation_date: now,
                notes: `Возврат по отмене заказа #${id.slice(0, 8)}`,
              })
            )
        );
      }
    }

    await load(tab);
  };

  const handlePaymentChange = async (id: string, payment_method: string) => {
    await updateOrderPayment(id, payment_method);
    await load(tab);
  };

  const handleDelete = async (id: string) => {
    await deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
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
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => switchTab(id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                tab === id
                  ? id === "all"       ? "bg-slate-700 border-slate-600 text-white"
                  : id === "cancelled" ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                  : STATUS_COLORS[id as OrderStatus]
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-5 text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={() => load(tab)} className="text-xs text-slate-400 hover:text-white transition-colors">Повторить</button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-10 h-10 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <p className="text-slate-500 text-sm">Заказов нет</p>
          </div>
        )}

        {!loading && !error && orders.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            sym={sym}
            onStatusChange={handleStatusChange}
            onPaymentChange={handlePaymentChange}
            onDelete={handleDelete}
          />
        ))}
      </main>
    </div>
  );
}
