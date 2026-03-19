import { AdminShell } from "@/components/admin/admin-shell";
import { LabelOsDashboardClient } from "@/components/admin/label-os-dashboard";
import { getSiteLanguage } from "@/lib/i18n/server";
import { requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { getLabelOsDashboardData } from "@/modules/label-os/service";

export const dynamic = "force-dynamic";

export default async function AdminLabelOsPage() {
  await requireGrowthPageAccess("admin");
  const [data, lang] = await Promise.all([getLabelOsDashboardData(), getSiteLanguage()]);

  return (
    <AdminShell>
      <LabelOsDashboardClient initialData={data} lang={lang} />
    </AdminShell>
  );
}
