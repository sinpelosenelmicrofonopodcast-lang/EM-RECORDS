import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getArtistLeadPortalBundle, getNotificationsForUser, requireSigningArtistContext } from "@/lib/signing/service";

export async function requireArtistPortalBundle() {
  const ctx = await requireSigningArtistContext();
  const service = createServiceClient();

  let leadId: string | null = ctx.leadIds[0] ?? null;

  if (!leadId && ctx.email) {
    const { data: fallbackLead } = await service
      .from("artist_leads")
      .select("id")
      .eq("email", ctx.email)
      .not("status", "eq", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    leadId = fallbackLead?.id ? String(fallbackLead.id) : null;
  }

  if (!leadId) {
    redirect("/dashboard/artist-hub/pending");
  }

  const resolvedLeadId = leadId;
  const [bundle, notifications] = await Promise.all([getArtistLeadPortalBundle(resolvedLeadId), getNotificationsForUser(ctx.userId, ctx.leadIds)]);
  if (!bundle.lead) {
    redirect("/dashboard/artist-hub/pending");
  }

  return {
    ctx,
    leadId: resolvedLeadId,
    bundle,
    notifications
  };
}
