import { useState, useEffect, useCallback } from "react";
  import { getSettings, updateSettings, type PharmacySettings } from "@/lib/api";

  type Status = "loading" | "idle" | "saving" | "success" | "error";

  export default function Dashboard() {
    const [settings, setSettings] = useState<PharmacySettings | null>(null);
    const [form, setForm] = useState({ latitude: "", longitude: "", delivery_radius_km: "", max_requests_per_ip_per_day: "" });
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
          latitude: String(s.latitude),
          longitude: String(s.longitude),
          delivery_radius_km: String(s.delivery_radius_km),
          max_requests_per_ip_per_day: String(s.max_requests_per_ip_per_day),
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
      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      const radius = parseFloat(form.delivery_radius_km);
      const maxReq = parseInt(form.max_requests_per_ip_per_day, 10);

      if (isNaN(lat) || lat < -90 || lat > 90) { setError("Широта: от -90 до 90"); return; }
      if (isNaN(lng) || lng < -180 || lng > 180) { setError("Долгота: от -180 до 180"); return; }
      if (isNaN(radius) || radius <= 0) { setError("Радиус доставки должен быть больше 0"); return; }
      if (isNaN(maxReq) || maxReq <= 0) { setError("Лимит запросов должен быть больше 0"); return; }

      setStatus("saving");
      setError(null);
      try {
        await updateSettings(settings.id, {
          latitude: lat, longitude: lng,
          delivery_radius_km: radius,
          max_requests_per_ip_per_day: maxReq,
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm" />
                    <p className="text-xs text-slate-600 mt-1">от -90 до 90</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Долгота</label>
                    <input type="number" step="any" min="-180" max="180" placeholder="37.6176"
                      value={form.longitude}
                      onChange={e => setForm({ ...form, longitude: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm" />
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">км</span>
                  </div>
                  {form.delivery_radius_km && !isNaN(parseFloat(form.delivery_radius_km)) && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Площадь охвата: ~{(Math.PI * parseFloat(form.delivery_radius_km) ** 2).toFixed(1)} км²
                    </p>
                  )}
                </div>
              </div>

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
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-24 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm" />
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
                  status === "success" ? "bg-emerald-600 text-white"
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
  