import type { SupabaseClient } from "@supabase/supabase-js";

type AuditInput = {
  actorUserId?: string | null;
  artistLeadId?: string | null;
  contractId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

type SignatureEventInput = {
  contractId: string;
  signerRole?: "artist" | "label" | null;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

type NotificationInput = {
  artistLeadId?: string | null;
  userId?: string | null;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

type MessageInput = {
  artistLeadId: string;
  contractId?: string | null;
  senderUserId?: string | null;
  recipientUserId?: string | null;
  recipientRole?: string;
  subject?: string | null;
  body: string;
};

export async function appendSigningAuditLog(service: SupabaseClient, input: AuditInput) {
  await service.from("audit_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    artist_lead_id: input.artistLeadId ?? null,
    contract_id: input.contractId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {}
  });
}

export async function appendSignatureEvent(service: SupabaseClient, input: SignatureEventInput) {
  await service.from("signature_events").insert({
    contract_id: input.contractId,
    signer_role: input.signerRole ?? null,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {}
  });
}

export async function createInAppNotification(service: SupabaseClient, input: NotificationInput) {
  let resolvedUserId = input.userId ?? null;

  if (!resolvedUserId && input.artistLeadId) {
    const { data: lead } = await service.from("artist_leads").select("artist_profile_id").eq("id", input.artistLeadId).maybeSingle();
    const artistProfileId = lead?.artist_profile_id ? String(lead.artist_profile_id) : null;

    if (artistProfileId) {
      const { data: profile } = await service.from("artist_profiles").select("user_id").eq("id", artistProfileId).maybeSingle();
      resolvedUserId = profile?.user_id ? String(profile.user_id) : null;
    }
  }

  await service.from("notifications").insert({
    artist_lead_id: input.artistLeadId ?? null,
    user_id: resolvedUserId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata ?? {}
  });
}

export async function createSigningMessage(service: SupabaseClient, input: MessageInput) {
  await service.from("messages").insert({
    artist_lead_id: input.artistLeadId,
    contract_id: input.contractId ?? null,
    sender_user_id: input.senderUserId ?? null,
    recipient_user_id: input.recipientUserId ?? null,
    recipient_role: input.recipientRole ?? "artist",
    subject: input.subject ?? null,
    body: input.body
  });
}
