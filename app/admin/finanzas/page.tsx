import { AdminShell } from "@/components/admin/admin-shell";
import { FinanceDashboard } from "@/components/admin/finance-dashboard";
import { requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finanzas | EM Records", robots: { index: false, follow: false } };

export default async function FinancePage() {
  await requireGrowthPageAccess("admin");
  const db = createServiceClient();
  const [transactions, budgets, artists, releases] = await Promise.all([
    db.from("finance_transactions").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(1500),
    db.from("finance_budgets").select("*").order("month", { ascending: false }).limit(500),
    db.from("artists").select("id,name").order("name").limit(200),
    db.from("releases").select("id,title").order("title").limit(300)
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
        <FinanceDashboard
          initialTransactions={transactions.data ?? []}
          initialBudgets={budgets.data ?? []}
          artists={artists.data ?? []}
          releases={releases.data ?? []}
        />
      )}
    </AdminShell>
  );
}
