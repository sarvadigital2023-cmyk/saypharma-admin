import { useState, useEffect, useCallback, useRef } from "react";
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  type Product, type NewProduct,
} from "@/lib/api";

const EMPTY_BASE = {
  name: "", active_substance: "", form: "", country: "", age_category: "",
  prescription_required: false, dosage: "", side_effects: "", description: "", image_url: "",
};

type SaveStatus = "idle" | "saving" | "success" | "error";

export default function Products() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [formOpen, setFormOpen]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null); // null = режим добавления
  const [form, setForm]             = useState(EMPTY_BASE);
  const [priceStr, setPriceStr]     = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef                     = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { setProducts(await getProducts()); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "Ошибка загрузки"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof EMPTY_BASE, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => {
    setForm(EMPTY_BASE); setPriceStr(""); setSaveError(null); setEditId(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const openEdit = (p: Product) => {
    setForm({
      name:                  p.name,
      active_substance:      p.active_substance ?? "",
      form:                  p.form ?? "",
      country:               p.country ?? "",
      age_category:          p.age_category ?? "",
      prescription_required: p.prescription_required,
      dosage:                p.dosage ?? "",
      side_effects:          p.side_effects ?? "",
      description:           p.description ?? "",
      image_url:             p.image_url ?? "",
    });
    setPriceStr(p.price != null ? String(p.price) : "");
    setEditId(p.id);
    setSaveError(null);
    setExpandedId(null);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setSaveError("Название препарата обязательно"); return; }
    const price = parseFloat(priceStr.replace(",", "."));
    if (priceStr.trim() === "" || isNaN(price) || price < 0) {
      setSaveError("Введите корректную цену продажи (≥ 0)"); return;
    }
    setSaveStatus("saving"); setSaveError(null);
    try {
      const payload: NewProduct = { ...form, price, name: form.name.trim() };
      if (editId) {
        await updateProduct(editId, payload);
      } else {
        await createProduct(payload);
      }
      resetForm();
      setFormOpen(false);
      setSaveStatus("success");
      await load();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Ошибка сохранения");
      setSaveStatus("idle");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить препарат?")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      if (editId === id) { resetForm(); setFormOpen(false); }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    } finally { setDeletingId(null); }
  };

  const fmt = (n: number | null) =>
    n == null ? "—" : Number(n).toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " €";

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 text-sm";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1";
  const isEdit   = editId !== null;

  return (
    <div className="bg-slate-950 min-h-screen">
      <header className="pt-safe border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-xs font-bold">S</span>
          </div>
          <span className="text-white font-semibold text-sm">SayPharma Admin</span>
          <span className="ml-auto text-xs text-slate-500">{products.length} препаратов</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Кнопка «Добавить» (скрывается в режиме редактирования) ── */}
        {!isEdit && (
          <button
            onClick={() => { formOpen ? (setFormOpen(false), resetForm()) : openAdd(); }}
            className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl px-5 py-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">Добавить препарат</span>
            </div>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${formOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* ── Форма добавления / редактирования ── */}
        {formOpen && (
          <div ref={formRef}>
            <form onSubmit={handleSubmit} className={`border rounded-2xl p-5 space-y-4 ${
              isEdit
                ? "bg-blue-950/20 border-blue-700/40"
                : "bg-slate-900 border-slate-800"
            }`}>

              {/* Заголовок формы */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isEdit ? "bg-blue-500/10 border border-blue-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
                }`}>
                  {isEdit
                    ? <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                    : <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  }
                </div>
                <p className={`text-sm font-semibold ${isEdit ? "text-blue-300" : "text-white"}`}>
                  {isEdit ? `Редактирование: ${form.name || "препарат"}` : "Новый препарат"}
                </p>
              </div>

              {/* Название */}
              <div>
                <label className={labelCls}>Название препарата <span className="text-red-400">*</span></label>
                <input className={inputCls} placeholder="Нурофен" value={form.name}
                  onChange={e => set("name", e.target.value)} />
              </div>

              {/* Цена */}
              <div>
                <label className={labelCls}>Цена продажи (€) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="text" inputMode="decimal" placeholder="0.00"
                    value={priceStr}
                    onChange={e => setPriceStr(e.target.value)}
                    className={`${inputCls} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">€</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">Введите число, например 12.50</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Активное вещество</label>
                  <input className={inputCls} placeholder="Ибупрофен" value={form.active_substance}
                    onChange={e => set("active_substance", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Форма выпуска</label>
                  <input className={inputCls} placeholder="Таблетки" value={form.form}
                    onChange={e => set("form", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Страна производства</label>
                  <input className={inputCls} placeholder="Германия" value={form.country}
                    onChange={e => set("country", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Возрастная категория</label>
                  <input className={inputCls} placeholder="18+" value={form.age_category}
                    onChange={e => set("age_category", e.target.value)} />
                </div>
              </div>

              {/* Рецепт */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={form.prescription_required}
                    onChange={e => set("prescription_required", e.target.checked)} />
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.prescription_required ? "bg-emerald-500" : "bg-slate-700"}`} />
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.prescription_required ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <span className="text-sm text-slate-300">Требуется рецепт</span>
              </label>

              {/* Дозировка */}
              <div>
                <label className={labelCls}>Дозировка / применение</label>
                <input className={inputCls} placeholder="400 мг / 3 раза в день" value={form.dosage}
                  onChange={e => set("dosage", e.target.value)} />
              </div>

              {/* Побочные */}
              <div>
                <label className={labelCls}>Побочные эффекты</label>
                <textarea className={`${inputCls} resize-none`} rows={2}
                  placeholder="Тошнота, головокружение..." value={form.side_effects}
                  onChange={e => set("side_effects", e.target.value)} />
              </div>

              {/* Описание */}
              <div>
                <label className={labelCls}>Описание / инструкция</label>
                <textarea className={`${inputCls} resize-none`} rows={3}
                  placeholder="Применяется при болях, воспалениях..." value={form.description}
                  onChange={e => set("description", e.target.value)} />
              </div>

              {/* Фото */}
              <div>
                <label className={labelCls}>Ссылка на фото</label>
                <input className={inputCls} placeholder="https://..." value={form.image_url}
                  onChange={e => set("image_url", e.target.value)} />
              </div>

              {saveError && (
                <div className="bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-sm">{saveError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setFormOpen(false); resetForm(); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-600 hover:text-slate-300 transition-colors">
                  Отмена
                </button>
                <button type="submit" disabled={saveStatus === "saving"}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    saveStatus === "saving"
                      ? "bg-emerald-600/50 text-white/50 cursor-not-allowed"
                      : isEdit
                        ? "bg-blue-500 hover:bg-blue-400 text-white"
                        : "bg-emerald-500 hover:bg-emerald-400 text-white"
                  }`}>
                  {saveStatus === "saving" && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saveStatus === "saving" ? "Сохранение…" : isEdit ? "Сохранить изменения" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Список товаров ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Все препараты</h2>
            <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && loadError && (
            <div className="px-5 py-8 text-center">
              <p className="text-red-400 text-sm mb-3">{loadError}</p>
              <button onClick={load} className="text-xs text-slate-400 hover:text-white">Повторить</button>
            </div>
          )}

          {!loading && !loadError && products.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-slate-500 text-sm">Препараты ещё не добавлены</p>
            </div>
          )}

          {!loading && !loadError && products.length > 0 && (
            <div className="divide-y divide-slate-800">
              {products.map(p => {
                const isOpen   = expandedId === p.id;
                const isEditing = editId === p.id;
                return (
                  <div key={p.id} className={isEditing ? "ring-1 ring-blue-500/30 bg-blue-950/10" : ""}>

                    {/* ─ Заголовок карточки ─ */}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : p.id)}
                      className="w-full text-left px-5 py-4 flex items-start gap-3"
                    >
                      {/* Фото / заглушка */}
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium leading-tight truncate">{p.name}</p>
                          {isEditing && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">
                              редакт.
                            </span>
                          )}
                          <svg className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ml-auto mt-0.5 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                          </svg>
                        </div>
                        <p className="text-emerald-400 text-sm font-semibold mt-0.5">{fmt(p.price)}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {p.form && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">{p.form}</span>}
                          {p.country && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">{p.country}</span>}
                          {p.age_category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">{p.age_category}</span>}
                          {p.prescription_required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">Рецепт</span>
                          )}
                        </div>
                        {p.active_substance && (
                          <p className="text-slate-600 text-xs mt-1 truncate">{p.active_substance}</p>
                        )}
                      </div>
                    </button>

                    {/* ─ Раскрытые детали ─ */}
                    {isOpen && (
                      <div className="border-t border-slate-800 px-5 py-4 space-y-3 bg-slate-900/50">
                        {p.dosage && (
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Дозировка / применение</p>
                            <p className="text-slate-300 text-sm">{p.dosage}</p>
                          </div>
                        )}
                        {p.side_effects && (
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Побочные эффекты</p>
                            <p className="text-slate-300 text-sm">{p.side_effects}</p>
                          </div>
                        )}
                        {p.description && (
                          <div>
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Описание</p>
                            <p className="text-slate-300 text-sm">{p.description}</p>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-slate-600">ID: {p.id.slice(0, 8)}…</span>
                          <span className="text-slate-600">{new Date(p.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>

                        {/* Кнопки действий */}
                        <div className="flex gap-2 pt-1">
                          {/* Редактировать */}
                          <button
                            onClick={() => openEdit(p)}
                            className="flex-1 py-2 rounded-xl border border-blue-700/40 text-blue-400 text-xs hover:bg-blue-950/30 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                            Редактировать
                          </button>
                          {/* Удалить */}
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="flex-1 py-2 rounded-xl border border-red-800/40 text-red-400 text-xs hover:bg-red-950/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {deletingId === p.id
                              ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            }
                            {deletingId === p.id ? "Удаление…" : "Удалить"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
