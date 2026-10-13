import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, FileText, Wallet, TriangleAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireFinancePageAccess } from "@/lib/finance/access";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "DistroKid | Finanzas EM Records", robots: { index: false, follow: false } };

type Service = { service: string; amount_cents: number; estimated_remainder?: boolean };
type Withdrawal = { date: string; method: string; amount_cents: number };
type Adjustment = { date: string; description: string; amount_cents: number };
type Report = {
  id: string; source_file_name: string; captured_on: string; earnings_from: string; earnings_through: string;
  streaming_earnings_cents: number; withdrawals_cents: number; adjustments_cents: number; owed_cents: number;
  services: Service[]; withdrawals: Withdrawal[]; adjustments: Adjustment[];
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents) / 100);

export default async function DistroKidReportPage() {
  await requireFinancePageAccess();
  const db = createServiceClient();
  const { data, error } = await db.from("finance_distrokid_reports")
    .select("*").order("captured_on", { ascending: false }).order("imported_at", { ascending: false }).limit(30);
  const reports = (data ?? []) as Report[];
  const r = reports[0];
  const services = r?.services ?? [];
  const withdrawals = r?.withdrawals ?? [];
  const adjustments = r?.adjustments ?? [];
  const max = Math.max(1, ...services.map((row) => row.amount_cents));

  return <AdminShell>
    <div className="space-y-5">
      <Link href="/admin/finanzas" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#c6a85b]"><ArrowLeft size={16}/> Volver a Finanzas</Link>
      <header className="premium-surface rounded-[28px] p-6 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#c6a85b]">EM Records / Estado bancario externo</p>
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">DistroKid Bank</h1>
        <p className="mt-3 text-sm text-white/60">Registro histórico importado desde el PDF original; no es una conexión en tiempo real.</p>
        {r && <p className="mt-3 text-xs text-white/40">Documento: {r.source_file_name} · Captura: {r.captured_on} · Periodo de ganancias: febrero 2020 – agosto 2026</p>}
      </header>
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">No se pudo cargar el estado DistroKid: {error.message}</p>}
      {!error && !r && <p className="rounded-xl border border-white/10 p-6 text-sm text-white/60">Todavía no hay estados de cuenta importados.</p>}
      {r && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Ganancias por streaming", r.streaming_earnings_cents, "text-emerald-300"],
            ["Retiros de fondos", r.withdrawals_cents, "text-white"],
            ["Ajustes netos", r.adjustments_cents, "text-[#c6a85b]"],
            ["Pendiente por retirar", r.owed_cents, "text-[#c6a85b]"]
          ].map(([title,value,tone]) => <div key={String(title)} className="metric-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.13em] text-white/50">{title}</p>
            <p className={`mt-3 text-2xl font-semibold ${tone}`}>{money(Number(value))}</p>
          </div>)}
        </section>
        <div className="flex gap-3 rounded-xl border border-[#c6a85b]/25 bg-[#c6a85b]/5 p-4 text-sm leading-relaxed text-white/70">
          <Wallet className="mt-0.5 shrink-0 text-[#c6a85b]" size={19}/>
          <p>Conciliación: {money(r.streaming_earnings_cents)} de streaming + {money(r.adjustments_cents)} de ajustes − {money(r.withdrawals_cents)} de retiros = <strong className="text-[#c6a85b]">{money(r.owed_cents)} pendiente</strong>. Los ajustes incluyen devoluciones de pagos fallidos; no deben sumarse otra vez como regalías ni como ingresos operacionales.</p>
        </div>
        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="app-panel rounded-[24px] p-5 md:p-6">
            <h2 className="text-xl font-semibold text-white">Ingresos por plataforma</h2>
            <p className="mt-1 text-xs text-white/45">Desglose acumulado, no ingresos de un solo mes</p>
            <div className="mt-6 space-y-4">
              {services.map((s) => <div key={s.service}>
                <div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-white/80">{s.service}</span><span className="font-semibold text-white">{money(s.amount_cents)}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${s.estimated_remainder ? "bg-white/30" : "bg-[#c6a85b]"}`} style={{width:`${100*s.amount_cents/max}%`}}/></div>
                {s.estimated_remainder && <p className="mt-1 text-[11px] text-white/40">Diferencia calculada entre el total y las plataformas visibles; no atribuida por DistroKid.</p>}
              </div>)}
            </div>
          </article>
          <article className="app-panel rounded-[24px] p-5 md:p-6">
            <h2 className="text-xl font-semibold text-white">Observaciones del reporte</h2>
            <div className="mt-5 space-y-4">
              <div className="flex gap-3"><Clock3 size={20} className="shrink-0 text-[#c6a85b]"/><p className="text-sm text-white/70">DistroKid indicaba que las ganancias de YouTube de julio y agosto de 2026 estaban demoradas al momento de generar este estado.</p></div>
              <div className="flex gap-3"><FileText size={20} className="shrink-0 text-[#c6a85b]"/><p className="text-sm text-white/70">El reporte señala <strong className="text-white">49 canciones elegibles</strong> para cobrar regalías editoriales. Eso no equivale a ingresos editoriales confirmados.</p></div>
              <div className="flex gap-3"><TriangleAlert size={20} className="shrink-0 text-[#c6a85b]"/><p className="text-sm text-white/70">Esta importación es informativa. No se agregaron {money(r.streaming_earnings_cents)} a los ingresos del mes ni se contabilizaron los retiros como gastos para evitar duplicaciones.</p></div>
            </div>
          </article>
        </section>
        <section className="app-panel overflow-hidden rounded-[24px]">
          <div className="border-b border-white/10 p-5"><h2 className="text-xl font-semibold text-white">Retiros registrados</h2><p className="mt-1 text-xs text-white/45">{withdrawals.length} pagos por Tipalti en el estado</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-white/40"><th className="p-4">Fecha</th><th className="p-4">Proveedor</th><th className="p-4 text-right">Importe</th></tr></thead>
            <tbody>{withdrawals.map((w,i)=><tr className="border-b border-white/[0.06]" key={w.date+"-"+i}><td className="p-4 text-white/65">{w.date}</td><td className="p-4 text-white/75">{w.method}</td><td className="p-4 text-right font-semibold text-white">{money(w.amount_cents)}</td></tr>)}
              <tr className="bg-white/[0.03]"><td colSpan={2} className="p-4 font-semibold text-white">Total de retiros</td><td className="p-4 text-right font-semibold text-[#c6a85b]">{money(r.withdrawals_cents)}</td></tr></tbody>
          </table></div>
        </section>
        <section className="app-panel overflow-hidden rounded-[24px]">
          <div className="border-b border-white/10 p-5"><h2 className="text-xl font-semibold text-white">Ajustes de la cuenta</h2><p className="mt-1 text-xs text-white/45">Devoluciones, cargos y correcciones de DistroKid</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-white/40"><th className="p-4">Fecha</th><th className="p-4">Motivo</th><th className="p-4 text-right">Importe</th></tr></thead>
            <tbody>{adjustments.map((a,i)=><tr className="border-b border-white/[0.06]" key={a.date+"-"+i}><td className="whitespace-nowrap p-4 text-white/65">{a.date}</td><td className="p-4 text-white/75">{a.description}</td><td className={`p-4 text-right font-semibold ${a.amount_cents<0?"text-rose-300":"text-emerald-300"}`}>{a.amount_cents>0?"+":""}{money(a.amount_cents)}</td></tr>)}
              <tr className="bg-white/[0.03]"><td colSpan={2} className="p-4 font-semibold text-white">Ajustes netos</td><td className="p-4 text-right font-semibold text-[#c6a85b]">{money(r.adjustments_cents)}</td></tr></tbody>
          </table></div>
        </section>
        {reports.length>1 && <section className="app-panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Historial de importaciones</h2>
          <p className="mt-1 text-xs text-white/50">{reports.length} estados registrados. La vista muestra el más reciente.</p>
          <div className="mt-3 space-y-1">{reports.map(report=><p key={report.id} className="text-sm text-white/70">{report.captured_on}: {money(report.owed_cents)} pendiente · {report.source_file_name}</p>)}</div>
        </section>}
        <p className="text-xs text-white/35">La fuente es una captura de DistroKid Bank, no un reporte transaccional completo ni una declaración contable auditada.</p>
      </>}
    </div>
  </AdminShell>;
}
