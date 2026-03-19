import { SocialMediaControlCenter } from "@/components/social-media/control-center";
import { SocialMediaShell } from "@/components/social-media/social-media-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { getSocialMediaDashboardData } from "@/modules/social-media/service";

export const dynamic = "force-dynamic";

export default async function DashboardSocialMediaPage() {
  await requireGrowthPageAccess("admin");
  const data = await getSocialMediaDashboardData();

  return (
    <SocialMediaShell>
      <PageIntro
        eyebrow="EM Records"
        title="Social Media Control Center"
        description="Un solo tab para ver contenido, generar captions con AI, adjuntar links públicos correctos, publicar en Meta y dejar el resto listo para operación manual sin confusión ni flujos dispersos."
      />
      <SocialMediaControlCenter initialData={data} />
    </SocialMediaShell>
  );
}
