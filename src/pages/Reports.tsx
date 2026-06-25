import { useState, useEffect, useCallback } from "react";
import { getStockReport, type StockReportRow } from "@/lib/api";
import { useCurrency } from "@/lib/CurrencyContext";

type Tab = "balance" | "expiry";

// ── CSV export ────────────────────────────────────────────────────────────────

function toCSV(rows: string[][]): string {
  return rows
    .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCSV(content: string, filename: string) {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmt(n: number | null | undefined, qty?: number): string {
  if (n == null) return "—";
  const v = qty != null ? n * qty : n;
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU");
}

function expiryStatus(expiry: string | null): "expired" | "soon" | "ok" | "none" {
  if (!expiry) return "none";
  const d = new Date(expiry);
  const now = new Date();
  if (d < now) return "expired";
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 3);
  if (d <= soon) return "soon";
  return "ok";
}

// ── Balance table ─────────────────────────────────────────────────────────────

const BALANCE_HEADERS = [
  "Наименование",
  "Форма",
  "Активное вещество",
  "Кол-во",
  "Цена без НДС",
  "Цена с НДС",
  "Итого без НДС",
  "Итого с НДС",
  "Срок годности",
  "Дата поступления",
  "Рецепт",
  "Применение / Дозировка",
];

function exportBalance(rows: StockReportRow[]) {
  const data = [
    BALANCE_HEADERS,
    ...rows.map(r => [
      r.name,
      r.form ?? "",
      r.active_substance ?? "",
      String(r.current_quantity),
      fmt(r.price_without_vat),
      fmt(r.price_with_vat),
      fmt(r.price_without_vat, r.current_quantity),
      fmt(r.price_with_vat, r.current_quantity),
      fmtDate(r.expiry_date),
      fmtDate(r.last_received_date),
      r.prescription_required ? "Рецептурный" : "Безрецептурный",
      r.applicability ?? "",
    ]),
  ];
  downloadCSV(toCSV(data), `остатки_${new Date().toISOString().slice(0, 10)}.csv`);
}

function BalanceTab({ rows }: { rows: StockReportRow[] }) {
  const { sym } = useCurrency();
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-slate-400 text-xs">{rows.length} позиций</p>
        <button
          onClick={() => exportBalance(rows)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium active:opacity-70"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
          </svg>
          CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="Нет данных об остатках" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                {BALANCE_HEADERS.map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2 text-left font-medium text-slate-400 bg-slate-900 border-b border-slate-800 whitespace-nowrap ${i === 0 ? "sticky left-0 z-10 bg-slate-900" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const es = expiryStatus(r.expiry_date);
                const expiryCls =
                  es === "expired" ? "text-red-400" :
                  es === "soon"    ? "text-amber-400" : "text-slate-300";
                return (
                  <tr key={r.product_id} className={ri % 2 === 0 ? "bg-slate-950" : "bg-slate-900/40"}>
                    <td className={`px-3 py-2.5 font-medium text-white whitespace-nowrap sticky left-0 z-10 ${ri % 2 === 0 ? "bg-slate-950" : "bg-slate-900/70"}`}>
                      {r.name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{r.form ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{r.active_substance ?? "—"}</td>
                    <td className="px-3 py-2.5 text-white font-semibold text-right whitespace-nowrap">{r.current_quantity}</td>
                    <td className="px-3 py-2.5 text-slate-300 text-right whitespace-nowrap">{fmt(r.price_without_vat)}</td>
                    <td className="px-3 py-2.5 text-slate-300 text-right whitespace-nowrap">{fmt(r.price_with_vat)}</td>
                    <td className="px-3 py-2.5 text-emerald-400 text-right font-medium whitespace-nowrap">
                      {fmt(r.price_without_vat, r.current_quantity)}
                    </td>
                    <td className="px-3 py-2.5 text-emerald-400 text-right font-medium whitespace-nowrap">
                      {fmt(r.price_with_vat, r.current_quantity)}
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${expiryCls}`}>{fmtDate(r.expiry_date)}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(r.last_received_date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${r.prescription_required ? "bg-violet-500/15 text-violet-400 border-violet-500/30" : "bg-slate-700/50 text-slate-400 border-slate-600"}`}>
                        {r.prescription_required ? "Рецептурный" : "Безрецептурный"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[180px] truncate">{r.applicability ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals footer */}
      {rows.length > 0 && (() => {
        const totalQty = rows.reduce((a, r) => a + r.current_quantity, 0);
        const totalNoVat = rows.reduce((a, r) => a + (r.price_without_vat != null ? r.price_without_vat * r.current_quantity : 0), 0);
        const totalVat   = rows.reduce((a, r) => a + (r.price_with_vat    != null ? r.price_with_vat    * r.current_quantity : 0), 0);
        return (
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/60">
            <div className="text-xs">
              <span className="text-slate-500">Позиций: </span>
              <span className="text-white font-semibold">{rows.length}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">Единиц: </span>
              <span className="text-white font-semibold">{totalQty}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">Итого без НДС: </span>
              <span className="text-emerald-400 font-semibold">{totalNoVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {sym}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">Итого с НДС: </span>
              <span className="text-emerald-400 font-semibold">{totalVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {sym}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Expiry table ──────────────────────────────────────────────────────────────

const EXPIRY_HEADERS = ["Наименование", "Форма", "Кол-во", "Срок годности", "Статус", "Цена без НДС", "Цена с НДС"];

function exportExpiry(rows: StockReportRow[]) {
  const filtered = rows
    .map(r => ({ ...r, es: expiryStatus(r.expiry_date) }))
    .filter(r => r.es === "expired" || r.es === "soon")
    .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));

  const data = [
    EXPIRY_HEADERS,
    ...filtered.map(r => [
      r.name,
      r.form ?? "",
      String(r.current_quantity),
      fmtDate(r.expiry_date),
      r.es === "expired" ? "Просрочено" : "Истекает в 3 мес.",
      fmt(r.price_without_vat),
      fmt(r.price_with_vat),
    ]),
  ];
  downloadCSV(toCSV(data), `просрочка_${new Date().toISOString().slice(0, 10)}.csv`);
}

function ExpiryTab({ rows }: { rows: StockReportRow[] }) {
  const annotated = rows
    .map(r => ({ ...r, es: expiryStatus(r.expiry_date) }))
    .filter(r => r.es === "expired" || r.es === "soon")
    .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));

  const expired = annotated.filter(r => r.es === "expired");
  const soon    = annotated.filter(r => r.es === "soon");

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-slate-400">Просрочено: <strong className="text-red-400">{expired.length}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">Истекает: <strong className="text-amber-400">{soon.length}</strong></span>
          </span>
        </div>
        <button
          onClick={() => exportExpiry(rows)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium active:opacity-70"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
          </svg>
          CSV
        </button>
      </div>

      {annotated.length === 0 ? (
        <EmptyState text="Нет просроченных и скоро истекающих товаров" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: 620 }}>
            <thead>
              <tr>
                {EXPIRY_HEADERS.map((h, i) => (
                  <th key={h} className={`px-3 py-2 text-left font-medium text-slate-400 bg-slate-900 border-b border-slate-800 whitespace-nowrap ${i === 0 ? "sticky left-0 z-10" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {annotated.map((r, ri) => {
                const isExpired = r.es === "expired";
                const rowBg = isExpired
                  ? (ri % 2 === 0 ? "bg-red-950/30" : "bg-red-950/20")
                  : (ri % 2 === 0 ? "bg-amber-950/20" : "bg-amber-950/10");
                const nameBg = isExpired
                  ? (ri % 2 === 0 ? "bg-red-950/40" : "bg-red-950/30")
                  : (ri % 2 === 0 ? "bg-amber-950/30" : "bg-amber-950/20");
                return (
                  <tr key={r.product_id} className={rowBg}>
                    <td className={`px-3 py-2.5 font-medium text-white whitespace-nowrap sticky left-0 z-10 ${nameBg}`}>
                      {r.name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{r.form ?? "—"}</td>
                    <td className="px-3 py-2.5 text-white font-semibold text-right whitespace-nowrap">{r.current_quantity}</td>
                    <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${isExpired ? "text-red-400" : "text-amber-400"}`}>
                      {fmtDate(r.expiry_date)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${isExpired ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                        {isExpired ? "Просрочено" : "Истекает в 3 мес."}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 text-right whitespace-nowrap">{fmt(r.price_without_vat)}</td>
                    <td className="px-3 py-2.5 text-slate-300 text-right whitespace-nowrap">{fmt(r.price_with_vat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      </div>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [tab, setTab]     = useState<Tab>("balance");
  const [rows, setRows]   = useState<StockReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStockReport();
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-slate-950 min-h-screen">
      {/* Header */}
      <header className="pt-safe border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-xs font-bold">S</span>
            </div>
            <span className="text-white font-semibold text-sm">Отчёты</span>
          </div>
          <button
            onClick={load}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0 flex">
          {([
            { id: "balance" as Tab, label: "Остатки" },
            { id: "expiry"  as Tab, label: "Просрочка" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="w-6 h-6 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
          </div>
        )}

        {!loading && error && (
          <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={load} className="mt-2 text-xs text-slate-400 underline">Повторить</button>
          </div>
        )}

        {!loading && !error && tab === "balance"  && <BalanceTab rows={rows} />}
        {!loading && !error && tab === "expiry"   && <ExpiryTab  rows={rows} />}
      </div>
    </div>
  );
}
