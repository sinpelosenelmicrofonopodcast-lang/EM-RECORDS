"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, CalendarDays, Download,
  FileText, Landmark, Pencil, Plus, Receipt, Search, Trash2, Wallet, X
} from "lucide-react";

type Entry = {
  id: string;
  kind: "expense" | "income";
  occurred_on: string;
  description: string;
  amount_cents: number;
  category: string;
  artist_id: string | null;
  release_id: string | null;
  project_name: string | null;
  counterparty: string | null;
  payment_method: "card" | "bank" | "cash" | "paypal" | "other";
  receipt_path: string | null;
  notes: string | null;
};
type Budget = { id: string; month: string; category: string; amount_cents: number };
type Option = { id: string; name?: string; title?: string };
type Props = {
  initialTransactions: Entry[];
  initialBudgets: Budget[];
  artists: Option[];
  releases: Option[];
};
type FormState = {
  kind: "expense" | "income";
  occurred_on: string;
  description: string;
  amount: string;
  category: string;
  artist_id: string;
  release_id: string;
  project_name: string;
  counterparty: string;
  payment_method: "card" | "bank" | "cash" | "paypal" | "other";
  receipt_path: string;
  notes: string;
};
const expenseCategories = [
  "Producción musical", "Estudio y equipo", "Video y fotografía",
  "Marketing y publicidad", "Distribución digital", "Artistas y colaboradores",
  "Transporte y viajes", "Software y suscripciones", "Administración y legal",
  "Eventos", "Otros gastos"
];
const incomeCategories = [
  "Streaming", "Regalías", "Ventas de beats", "Licencias",
  "Producción y servicios", "Eventos", "Distribución", "Otros ingresos"
];
const dollar = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents) / 100);
const day = () => { const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); };
const blank = (kind: "expense" | "income" = "expense"): FormState => ({
  kind, occurred_on: day(), description: "", amount: "", category: kind === "expense" ? expenseCategories[0] : incomeCategories[0],
  artist_id: "", release_id: "", project_name: "", counterparty: "",
  payment_method: "card", receipt_path: "", notes: ""
});
const field = "w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#c6a85b]";
const btn = "rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:border-[#c6a85b]/60 hover:text-white";
const primary = "rounded-xl bg-[#c6a85b] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e0c578] disabled:opacity-50";
const cleanCsv = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

export function FinanceDashboard({ initialTransactions, initialBudgets, artists, releases }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(day().slice(0, 7));
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [artistFilter, setArtistFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [budgetCategory, setBudgetCategory] = useState(expenseCategories[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const monthly = useMemo(() => initialTransactions.filter((t) => t.occurred_on.slice(0, 7) === month), [initialTransactions, month]);
  const filtered = useMemo(() => monthly.filter((t) =>
    (kindFilter === "all" || t.kind === kindFilter) &&
    (!artistFilter || t.artist_id === artistFilter) &&
    (!query || [t.description, t.category, t.counterparty, t.project_name, t.notes, artists.find((a) => a.id === t.artist_id)?.name]
      .some((v) => String(v ?? "").toLowerCase().includes(query.toLowerCase())))
  ), [monthly, kindFilter, artistFilter, query, artists]);
  const stats = useMemo(() => {
    const rows = artistFilter ? monthly.filter((t) => t.artist_id === artistFilter) : monthly;
    const income = rows.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount_cents), 0);
    const expenses = rows.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount_cents), 0);
    return { income, expenses, balance: income - expenses, count: rows.length };
  }, [monthly, artistFilter]);
  const budgetRows = useMemo(() => initialBudgets.filter((b) => b.month.slice(0, 7) === month).map((b) => ({
    ...b,
    spent: monthly.filter((t) => t.kind === "expense" && t.category === b.category).reduce((s, t) => s + Number(t.amount_cents), 0)
  })), [initialBudgets, month, monthly]);
  const chart = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const [year, m] = month.split("-").map(Number);
    const d = new Date(year, m - 1 - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rows = initialTransactions.filter((t) => t.occurred_on.startsWith(key));
    return {
      key, label: new Intl.DateTimeFormat("es", { month: "short" }).format(d),
      income: rows.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount_cents), 0),
      expenses: rows.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount_cents), 0)
    };
  }), [month, initialTransactions]);
  const maxChart = Math.max(1, ...chart.flatMap((r) => [r.income, r.expenses]));
  const artistName = (id: string | null) => artists.find((a) => a.id === id)?.name ?? "—";
  const releaseName = (id: string | null) => releases.find((a) => a.id === id)?.title ?? "";

  function openNew(kind: "expense" | "income") {
    setEditingId(null); setForm(blank(kind)); setFile(null); setError(""); setModalOpen(true);
  }
  function openEdit(t: Entry) {
    setEditingId(t.id); setFile(null); setError("");
    setForm({
      kind: t.kind, occurred_on: t.occurred_on, description: t.description,
      amount: (Number(t.amount_cents) / 100).toFixed(2), category: t.category,
      artist_id: t.artist_id ?? "", release_id: t.release_id ?? "",
      project_name: t.project_name ?? "", counterparty: t.counterparty ?? "",
      payment_method: t.payment_method, receipt_path: t.receipt_path ?? "", notes: t.notes ?? ""
    });
    setModalOpen(true);
  }
  function change<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((old) => ({ ...old, [name]: value }));
  }
  async function api(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/admin/finance", {
      method, headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "No se pudo completar la operación.");
    return data;
  }
  function refreshed(message: string) {
    setNotice(message);
    startTransition(() => router.refresh());
  }
  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const amount = Number(form.amount);
      const cents = Math.round(amount * 100);
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(cents)) throw new Error("Introduce un importe válido.");
      let receiptPath = form.receipt_path || null;
      if (file) {
        const fd = new FormData(); fd.append("file", file);
        const response = await fetch("/api/admin/finance/receipts", { method: "POST", body: fd });
        const uploaded = await response.json().catch(() => null);
        if (!response.ok) throw new Error(uploaded?.error || "No se pudo subir el comprobante.");
        receiptPath = uploaded.path;
      }
      const data = {
        kind: form.kind, occurred_on: form.occurred_on, description: form.description.trim(),
        amount_cents: cents, category: form.category, artist_id: form.artist_id || null,
        release_id: form.release_id || null, project_name: form.project_name.trim() || null,
        counterparty: form.counterparty.trim() || null, payment_method: form.payment_method,
        receipt_path: receiptPath, notes: form.notes.trim() || null
      };
      await api(editingId ? "PATCH" : "POST", { resource: "transaction", ...(editingId ? { id: editingId } : {}), data });
      setModalOpen(false);
      refreshed(editingId ? "Movimiento actualizado." : "Movimiento registrado.");
    } catch (err) { setError(err instanceof Error ? err.message : "Error guardando."); }
    finally { setSaving(false); }
  }
  async function removeEntry(id: string) {
    if (!window.confirm("¿Eliminar permanentemente este movimiento y su comprobante?")) return;
    setSaving(true);
    try { await api("DELETE", { resource: "transaction", id }); refreshed("Movimiento eliminado."); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Error eliminando."); }
    finally { setSaving(false); }
  }
  async function openReceipt(path: string) {
    try {
      const response = await fetch("/api/admin/finance/receipts?path=" + encodeURIComponent(path));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No disponible");
      window.location.assign(data.url);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Error abriendo comprobante."); }
  }
  async function addBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = Math.round(Number(budgetAmount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) { setNotice("Presupuesto inválido."); return; }
    setSaving(true);
    try {
      await api("POST", { resource: "budget", data: { month: month + "-01", category: budgetCategory, amount_cents: cents } });
      setBudgetAmount(""); refreshed("Presupuesto guardado.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Error guardando presupuesto."); }
    finally { setSaving(false); }
  }
  async function removeBudget(id: string) {
    if (!window.confirm("¿Eliminar este presupuesto mensual?")) return;
    setSaving(true);
    try { await api("DELETE", { resource: "budget", id }); refreshed("Presupuesto eliminado."); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Error eliminando."); }
    finally { setSaving(false); }
  }
  function exportCsv() {
    const rows = [
      ["Fecha", "Tipo", "Concepto", "Categoría", "Cantidad USD", "Artista", "Lanzamiento", "Proyecto", "Proveedor / cliente", "Método", "Notas", "Comprobante"],
      ...filtered.map((t) => [
        t.occurred_on, t.kind === "expense" ? "Gasto" : "Ingreso", t.description, t.category,
        (Number(t.amount_cents) / 100).toFixed(2), artistName(t.artist_id), releaseName(t.release_id),
        t.project_name ?? "", t.counterparty ?? "", t.payment_method, t.notes ?? "", t.receipt_path ? "Sí" : "No"
      ])
    ];
    const csv = "\ufeff" + rows.map((r) => r.map(cleanCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `em-records-finanzas-${month}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="premium-surface relative overflow-hidden rounded-[28px] p-6 md:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#c6a85b]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.27em] text-[#c6a85b]">EM Records / Money Control</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-5xl">Finanzas del sello</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">Control de gastos, ingresos, proyectos, lanzamientos y presupuestos. Datos privados en USD.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={exportCsv} type="button"><Download size={16} className="mr-2 inline" />Exportar CSV</button>
            <button className={primary} onClick={() => openNew("expense")} type="button"><Plus size={16} className="mr-1 inline" />Nuevo gasto</button>
            <button className={btn} onClick={() => openNew("income")} type="button"><ArrowDownLeft size={16} className="mr-1 inline" />Ingreso</button>
          </div>
        </div>
      </header>

      {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[#c6a85b]/30 bg-[#c6a85b]/10 p-3 text-sm text-[#e0c578]"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Cerrar"><X size={16} /></button></div>}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-white/65"><CalendarDays size={17} /> Mes
          <input aria-label="Mes" type="month" className={field + " max-w-[190px]"} value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="text-sm text-white/65">Artista
          <select className={field + " ml-2 max-w-[190px]"} value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
            <option value="">Todos</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <span className="ml-auto text-xs text-white/40">Los importes se registran manualmente; no hay conexión bancaria.</span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Ingresos", value: stats.income, icon: ArrowDownLeft, tone: "text-emerald-300" },
          { title: "Gastos", value: stats.expenses, icon: ArrowUpRight, tone: "text-rose-300" },
          { title: "Balance", value: stats.balance, icon: Wallet, tone: stats.balance >= 0 ? "text-[#c6a85b]" : "text-rose-300" },
          { title: "Movimientos", value: stats.count, icon: Receipt, tone: "text-white" }
        ].map(({ title, value, icon: Icon, tone }) => (
          <article key={title} className="metric-card rounded-2xl p-5">
            <div className="flex items-center justify-between"><p className="text-xs uppercase tracking-widest text-white/50">{title}</p><Icon className={tone} size={18}/></div>
            <p className={`mt-3 text-2xl font-semibold tracking-tight md:text-3xl ${tone}`}>{title === "Movimientos" ? value : dollar(value)}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="app-panel rounded-[24px] p-5 md:p-6">
          <div className="mb-6 flex flex-wrap justify-between gap-2">
            <div><p className="text-xs uppercase tracking-[0.2em] text-[#c6a85b]">Tendencias</p><h2 className="mt-1 text-xl font-semibold">Últimos seis meses</h2></div>
            <div className="flex gap-4 text-xs text-white/55"><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#c6a85b]" />Ingresos</span><span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Gastos</span></div>
          </div>
          <div className="grid h-48 grid-cols-6 items-end gap-3 border-b border-white/10">
            {chart.map((item) => <div key={item.key} className="flex h-full flex-col justify-end gap-2">
              <div className="flex h-36 items-end justify-center gap-1">
                <div title={`Ingresos: ${dollar(item.income)}`} className="w-5 rounded-t-md bg-[#c6a85b]" style={{ height: Math.max(2, item.income / maxChart * 100) + "%" }} />
                <div title={`Gastos: ${dollar(item.expenses)}`} className="w-5 rounded-t-md bg-rose-400/75" style={{ height: Math.max(2, item.expenses / maxChart * 100) + "%" }} />
              </div>
              <p className="pb-2 text-center text-xs capitalize text-white/45">{item.label}</p>
            </div>)}
          </div>
        </section>
        <section className="app-panel rounded-[24px] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[#c6a85b]">Control</p><h2 className="mt-1 text-xl font-semibold">Presupuestos del mes</h2></div><Landmark className="text-[#c6a85b]" size={23}/></div>
          <form onSubmit={addBudget} className="mt-5 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <select aria-label="Categoría presupuesto" className={field} value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>{expenseCategories.map((c) => <option key={c}>{c}</option>)}</select>
            <input aria-label="Límite USD" required type="number" step="0.01" min="0.01" placeholder="Límite $" className={field} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
            <button disabled={saving} className={primary} type="submit">Guardar</button>
          </form>
          <div className="mt-5 max-h-56 space-y-4 overflow-y-auto">
            {budgetRows.length === 0 && <p className="text-sm text-white/45">Todavía no hay presupuestos definidos para este mes.</p>}
            {budgetRows.map((b) => {
              const percent = Math.round(b.spent / Number(b.amount_cents) * 100);
              return <div key={b.id}>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-white/80">{b.category}</span>
                  <span className={percent > 100 ? "text-rose-300" : "text-white/55"}>{dollar(b.spent)} / {dollar(b.amount_cents)} <button type="button" aria-label={"Eliminar presupuesto " + b.category} className="ml-1 text-white/40 hover:text-rose-300" onClick={() => void removeBudget(b.id)}><X size={13} className="inline" /></button></span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${percent > 100 ? "bg-rose-400" : "bg-[#c6a85b]"}`} style={{ width: Math.min(100, percent) + "%" }} /></div>
              </div>;
            })}
          </div>
        </section>
      </div>

      <section className="app-panel overflow-hidden rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#c6a85b]">Registro</p><h2 className="mt-1 text-xl font-semibold">Movimientos</h2><p className="mt-1 text-xs text-white/40">{filtered.length} registros en esta vista</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15}/><input aria-label="Buscar movimientos" className={field + " pl-9"} value={query} placeholder="Buscar..." onChange={(e) => setQuery(e.target.value)} /></label>
            <select aria-label="Filtrar tipo" className={field + " max-w-[150px]"} value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}><option value="all">Todos</option><option value="expense">Gastos</option><option value="income">Ingresos</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="border-b border-white/10 text-[11px] uppercase tracking-widest text-white/40"><th className="p-4 font-medium">Fecha</th><th className="p-4 font-medium">Concepto</th><th className="p-4 font-medium">Categoría</th><th className="p-4 font-medium">Artista / proyecto</th><th className="p-4 text-right font-medium">Importe</th><th className="p-4 text-right font-medium">Acciones</th></tr></thead>
            <tbody>
              {filtered.map((t) => <tr key={t.id} className="border-b border-white/[0.06] transition hover:bg-white/[0.025]">
                <td className="whitespace-nowrap p-4 text-white/55">{t.occurred_on}</td>
                <td className="p-4"><p className="font-medium text-white">{t.description}</p><p className="mt-1 text-xs text-white/35">{t.counterparty || t.payment_method}</p></td>
                <td className="p-4 text-white/65">{t.category}</td>
                <td className="p-4 text-white/65">{[t.artist_id ? artistName(t.artist_id) : "", t.project_name || releaseName(t.release_id)].filter(Boolean).join(" · ") || "General"}</td>
                <td className={`whitespace-nowrap p-4 text-right font-semibold ${t.kind === "expense" ? "text-rose-300" : "text-emerald-300"}`}>{t.kind === "expense" ? "−" : "+"}{dollar(t.amount_cents)}</td>
                <td className="whitespace-nowrap p-4 text-right">
                  {t.receipt_path && <button type="button" title="Abrir comprobante" aria-label="Abrir comprobante" className="mr-2 text-[#c6a85b] hover:text-white" onClick={() => void openReceipt(t.receipt_path!)}><FileText size={17} className="inline"/></button>}
                  <button type="button" title="Editar" aria-label="Editar" className="mr-2 text-white/55 hover:text-white" onClick={() => openEdit(t)}><Pencil size={16} className="inline"/></button>
                  <button type="button" title="Eliminar" aria-label="Eliminar" className="text-white/35 hover:text-rose-300" onClick={() => void removeEntry(t.id)}><Trash2 size={16} className="inline"/></button>
                </td>
              </tr>)}
              {!filtered.length && <tr><td colSpan={6} className="p-12 text-center text-sm text-white/45"><BarChart3 size={28} className="mx-auto mb-2 opacity-50"/>No hay movimientos para estos filtros. Agrega tu primer gasto o ingreso.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setModalOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-label="Registrar movimiento financiero" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/15 bg-[#121214] p-5 shadow-2xl md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#c6a85b]">EM Records</p><h2 className="mt-1 text-2xl font-semibold">{editingId ? "Editar movimiento" : "Nuevo movimiento"}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)} className="text-white/55 hover:text-white"><X size={20}/></button></div>
          <form onSubmit={saveEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">{(["expense", "income"] as const).map((k) => <button type="button" key={k} onClick={() => setForm((s) => ({ ...s, kind: k, category: k === "expense" ? expenseCategories[0] : incomeCategories[0] }))} className={`rounded-xl border p-3 text-sm ${form.kind === k ? "border-[#c6a85b] bg-[#c6a85b]/10 text-[#e0c578]" : "border-white/10 text-white/55"}`}>{k === "expense" ? "Gasto" : "Ingreso"}</button>)}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs text-white/60">Fecha *<input required type="date" className={field} value={form.occurred_on} onChange={(e) => change("occurred_on", e.target.value)} /></label>
              <label className="space-y-1.5 text-xs text-white/60">Importe USD *<input required min="0.01" step="0.01" type="number" className={field} value={form.amount} onChange={(e) => change("amount", e.target.value)} placeholder="0.00" /></label>
              <label className="space-y-1.5 text-xs text-white/60 sm:col-span-2">Concepto *<input required minLength={2} maxLength={180} className={field} value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="Ej. Mastering de nuevo sencillo" /></label>
              <label className="space-y-1.5 text-xs text-white/60">Categoría *<select required className={field} value={form.category} onChange={(e) => change("category", e.target.value)}>{(form.kind === "expense" ? expenseCategories : incomeCategories).map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-white/60">Método de pago<select className={field} value={form.payment_method} onChange={(e) => change("payment_method", e.target.value as FormState["payment_method"])}><option value="card">Tarjeta</option><option value="bank">Transferencia</option><option value="cash">Efectivo</option><option value="paypal">PayPal</option><option value="other">Otro</option></select></label>
              <label className="space-y-1.5 text-xs text-white/60">Artista<select className={field} value={form.artist_id} onChange={(e) => change("artist_id", e.target.value)}><option value="">General del sello</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-white/60">Lanzamiento<select className={field} value={form.release_id} onChange={(e) => change("release_id", e.target.value)}><option value="">Sin vincular</option>{releases.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
              <label className="space-y-1.5 text-xs text-white/60">Proyecto / video<input maxLength={180} className={field} value={form.project_name} onChange={(e) => change("project_name", e.target.value)} placeholder="Ej. Videoclip PAZ" /></label>
              <label className="space-y-1.5 text-xs text-white/60">Proveedor / cliente<input maxLength={180} className={field} value={form.counterparty} onChange={(e) => change("counterparty", e.target.value)} placeholder="Ej. DistroKid" /></label>
              <label className="space-y-1.5 text-xs text-white/60 sm:col-span-2">Notas<textarea rows={2} maxLength={3000} className={field} value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Notas de la operación" /></label>
              <label className="space-y-1.5 text-xs text-white/60 sm:col-span-2">Comprobante (PDF, JPG, PNG o WEBP; hasta 8 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" className={field} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{form.receipt_path && !file && <span className="block text-xs text-[#c6a85b]">Hay un comprobante guardado. Puedes reemplazarlo.</span>}</label>
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-white/10 pt-4"><button type="button" className={btn} disabled={saving} onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" disabled={saving} className={primary}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar movimiento"}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
