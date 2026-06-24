import { useState, useEffect, useCallback } from "react";
import {
  getSettings, updateSettings,
  type PharmacySettings, type Currency, CURRENCY_SYMBOL,
} from "@/lib/api";

type Status = "loading" | "idle" | "saving" | "success" | "error";

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "EUR", label: "Евро",    symbol: "€" },
  { value: "USD", label: "Доллар",  symbol: "$" },
  { value: "UAH", label: "Гривна",  symbol: "₴" },
];

export default function Dashboard() {
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [form, setForm] = useState({
    latitude: "", longitude: "", delivery_radius_km: "", max_requests_per_ip_per_day: "",
    delivery_fee: "", min_order_amount: "", working_hours: "", currency: "EUR" as Currency,
  });
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const s = await getSettings();
      setSettings(s);
      setForm({
        latitude:                   String(s.latitude),
        longitude:                  String(s.longitude),
        delivery_radius_km:         String(s.delivery_radius_km),
        max_requests_per_ip_per_day: String(s.max_requests_per_ip_per_day),
        delivery_fee:               String(s.delivery_fee ?? 0),
        min_order_amount:           String(s.min_order_amount ?? 0),
        working_hours:              s.working_hours ?? "09:00-21:00",
        currency:                   s.currency ?? "EUR",
      });
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    const lat    = parseFloat(form.latitude);
    const lng    = parseFloat(form.longitude);
    const radius = parseFloat(form.delivery_radius_km);
    const maxReq = parseInt(form.max_requests_per_ip_per_day, 10);
    const fee    = parseFloat(form.delivery_fee);
    const minAmt = parseFloat(form.min_order_amount);

    if (isNaN(lat)    || lat < -90  || lat > 90)   { setError("Широта: от -90 до 90"); return; }
    if (isNaN(lng)    || lng < -180 || lng > 180)   { setError("Долгота: от -180 до 180"); return; }
    if (isNaN(radius) || radius <= 0)               { setError("Радиус доставки должен быть больше 0"); return; }
    if (isNaN(maxReq) || maxReq <= 0)               { setError("Лимит запросов должен быть больше 0"); return; }
    if (isNaN(fee)    || fee < 0)                   { setError("Стоимость доставки не может быть отрицательной"); return; }
    if (isNaN(minAmt) || minAmt < 0)                { setError("Минимальная сумма заказа не может быть отрицательной"); return; }

    setStatus("saving");
    setError(null);
    try {
      await updateSettings(settings.id, {
        latitude: lat, longitude: lng,
        delivery_radius_km: radius,
        max_requests_per_ip_per_day: maxReq,
        delivery_fee: fee,
        min_order_amount: minAmt,
        working_hours: form.working_hours.trim() || "09:00-21:00",
        currency: form.currency,
      });
      setLastSaved(new Date().toLocaleTimeString("ru-RU"));
      await load();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
      setStatus("idle");
    }
  };

  const sym = CURRENCY_SYMBOL[form.currency] ?? "€";
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm";

  return (
    <div className="bg-slate-950">
      <header className="pt-safe border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">S</span>
          </div>
          <span className="text-white font-semibold text-sm">SayPharma Admin</span>
          <span className="ml-auto text-xs text-emerald-500/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Подключено к Supabase
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {status === "loading" && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "error" && !settings && (
          <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-5 text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={load} className="text-xs text-slate-400 hover:text-white transition-colors">Повторить</button>
          </div>
        )}

        {(status !== "loading" && settings) && (
          <>
            {/* ── Валюта ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Валюта</h2>
                  <p className="text-slate-500 text-xs">Используется для цен и расчётов</p>
                </div>
                {/* текущий символ */}
                <span className="ml-auto text-2xl font-bold text-emerald-400 leading-none">
                  {sym}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map(c => {
                  const active = form.currency === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, currency: c.value }))}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                      }`}
                    >
                      <span className="text-xl leading-none">{c.symbol}</span>
                      <span className="text-xs font-medium">{c.value}</span>
                      <span className="text-[10px] font-normal opacity-70">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Координаты ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Расположение аптеки</h2>
                  <p className="text-slate-500 text-xs">Координаты GPS</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Широта</label>
                  <input type="number" step="any" min="-90" max="90" placeholder="55.7558"
                    value={form.latitude}
                    onChange={e => setForm({ ...form, latitude: e.target.value })}
                    className={inputCls} />
                  <p className="text-xs text-slate-600 mt-1">от -90 до 90</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Долгота</label>
                  <input type="number" step="any" min="-180" max="180" placeholder="37.6176"
                    value={form.longitude}
                    onChange={e => setForm({ ...form, longitude: e.target.value })}
                    className={inputCls} />
                  <p className="text-xs text-slate-600 mt-1">от -180 до 180</p>
                </div>
              </div>
              {form.latitude && form.longitude && !isNaN(parseFloat(form.latitude)) && !isNaN(parseFloat(form.longitude)) && (
                <a href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Посмотреть на карте
                </a>
              )}
            </div>

            {/* ── Радиус ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159-.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Радиус доставки</h2>
                  <p className="text-slate-500 text-xs">Зона обслуживания</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Радиус (км)</label>
                <div className="relative">
                  <input type="number" step="0.1" min="0.1" placeholder="5.0"
                    value={form.delivery_radius_km}
                    onChange={e => setForm({ ...form, delivery_radius_km: e.target.value })}
                    className={`${inputCls} pr-10`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">км</span>
                </div>
                {form.delivery_radius_km && !isNaN(parseFloat(form.delivery_radius_km)) && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Площадь охвата: ~{(Math.PI * parseFloat(form.delivery_radius_km) ** 2).toFixed(1)} км²
                  </p>
                )}
              </div>
            </div>

            {/* ── Условия доставки ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Условия доставки</h2>
                  <p className="text-slate-500 text-xs">Стоимость и минимальный заказ</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Стоимость доставки</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      value={form.delivery_fee}
                      onChange={e => setForm({ ...form, delivery_fee: e.target.value })}
                      className={`${inputCls} pr-8`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{sym}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Минимальный заказ</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      value={form.min_order_amount}
                      onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                      className={`${inputCls} pr-8`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{sym}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Часы работы ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Часы работы</h2>
                  <p className="text-slate-500 text-xs">Режим работы аптеки</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">График работы</label>
                <input type="text" placeholder="09:00-21:00"
                  value={form.working_hours}
                  onChange={e => setForm({ ...form, working_hours: e.target.value })}
                  className={inputCls} />
                <p className="text-xs text-slate-600 mt-1">Пример: 09:00-21:00 или Пн-Пт 09:00-20:00</p>
              </div>
            </div>

            {/* ── IP-лимит ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">Защита от злоупотреблений</h2>
                  <p className="text-slate-500 text-xs">Ограничение запросов по IP</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Макс. запросов с одного IP в сутки</label>
                <div className="relative">
                  <input type="number" step="1" min="1" placeholder="100"
                    value={form.max_requests_per_ip_per_day}
                    onChange={e => setForm({ ...form, max_requests_per_ip_per_day: e.target.value })}
                    className={`${inputCls} pr-24`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">запр/день</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button onClick={handleSave} disabled={status === "saving"}
              className={`w-full font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${
                status === "success"  ? "bg-emerald-600 text-white"
                : status === "saving" ? "bg-emerald-600/50 text-white/50 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white"
              }`}>
              {status === "saving" && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {status === "success" && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              {status === "saving" ? "Сохранение..." : status === "success" ? "Сохранено" : "Сохранить настройки"}
            </button>

            {lastSaved && <p className="text-center text-xs text-slate-600">Последнее сохранение: {lastSaved}</p>}

            {settings && (
              <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium mb-2">Информация о записи</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">ID</span>
                    <span className="text-slate-500 font-mono">{settings.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Создано</span>
                    <span className="text-slate-500">{new Date(settings.created_at).toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Обновлено</span>
                    <span className="text-slate-500">{new Date(settings.updated_at).toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
