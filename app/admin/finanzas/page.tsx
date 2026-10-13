import Link from "next/link";
import { ArrowUpRight, Music2 } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { FinanceDashboard } from "@/components/admin/finance-dashboard";
import { requireFinancePageAccess } from "@/lib/finance/access";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finanzas | EM Records", robots: { index: false, follow: false } };

export default async function FinancePage() {
  await requireFinancePageAccess();
  const db = createServiceClient();
  const [transactions, budgets, artists, releases, distrokid] = await Promise.all([
    db.from("finance_transactions").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(1500),
    db.from("finance_budgets").select("*").order("month", { ascending: false }).limit(500),
    db.from("artists").select("id,name").order("name").limit(200),
    db.from("releases").select("id,title").order("title").limit(300),
    db.from("finance_distrokid_reports").select("captured_on,streaming_earnings_cents,withdrawals_cents,adjustments_cents,owed_cents").order("captured_on", { ascending: false }).limit(1).maybeSingle()
  ]);
  const error = [transactions.error, budgets.error, artists.error, releases.error].find(Boolean);
  return (
    <AdminShell>
      {error ? (
        <section className="app-panel rounded-2xl p-6 text-red-200">
          <h1 className="text-2xl font-semibold">Finanzas no disponibles</h1>
          <p className="mt-2 text-sm">No se pudo cargar la base de datos financiera. Verifica la migración y los permisos del sistema.</p>
        </section>
      ) : (
        <>
        {distrokid.data && <Link href="/admin/finanzas/distrokid" className="premium-surface group block rounded-[24px] p-5 transition hover:border-[#c6a85b]/50 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="rounded-xl border border-[#c6a85b]/30 bg-[#c6a85b]/10 p-3 text-[#c6a85b]"><Music2 size={23}/></span><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c6a85b]">Estado importado · DistroKid</p><h2 className="mt-1 text-lg font-semibold text-white">Banco y regalías históricas</h2><p className="mt-1 text-xs text-white/45">Captura {distrokid.data.captured_on} · separado del balance mensual</p></div></div>
            <span className="flex items-center gap-2 text-sm text-[#c6a85b]">Abrir desglose <ArrowUpRight size={16}/></span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-white/45">Streaming acumulado</p><p className="mt-1 text-xl font-semibold text-white">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(distrokid.data.streaming_earnings_cents/100)}</p></div><div><p className="text-xs text-white/45">Retiros registrados</p><p className="mt-1 text-xl font-semibold text-white">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(distrokid.data.withdrawals_cents/100)}</p></div><div><p className="text-xs text-white/45">DistroKid debe</p><p className="mt-1 text-xl font-semibold text-[#c6a85b]">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(distrokid.data.owed_cents/100)}</p></div></div>
        </Link>}
        <FinanceDashboard
          initialTransactions={transactions.data ?? []}
          initialBudgets={budgets.data ?? []}
          artists={artists.data ?? []}
          releases={releases.data ?? []}
        />
        </>
      )}
    </AdminShell>
  );
}
