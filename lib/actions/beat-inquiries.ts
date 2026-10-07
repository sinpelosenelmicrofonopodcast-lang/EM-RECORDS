"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getBeatInquiryThreadByToken, hashBeatInquiryToken } from "@/lib/beat-inquiries";
import { createServiceClient } from "@/lib/supabase/service";

const LICENSE_TYPES = ["basic", "standard", "premium", "exclusive", "unsure"] as const;
const INQUIRY_STATUSES = ["new", "in_review", "awaiting_customer", "negotiating", "closed", "declined"] as const;

function cleanText(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitBeatInquiryAction(formData: FormData) {
  const trap = cleanText(formData.get("website"), 200);
  if (trap) redirect("/beats");

  const beatId = cleanText(formData.get("beatId"), 80);
  const requesterName = cleanText(formData.get("name"), 120);
  const requesterEmail = cleanText(formData.get("email"), 320).toLowerCase();
  const licenseRaw = cleanText(formData.get("licenseType"), 30).toLowerCase();
  const licenseType = LICENSE_TYPES.includes(licenseRaw as any) ? licenseRaw : "unsure";
  const body = cleanText(formData.get("message"), 5000);

  if (!beatId || !requesterName || !validEmail(requesterEmail) || body.length < 2) {
    throw new Error("Name, valid email and message are required.");
  }

  const service = createServiceClient();
  const { data: beat, error: beatError } = await service
    .from("beats")
    .select("id,title,status,is_exclusive_sold")
    .eq("id", beatId)
    .maybeSingle();

  if (beatError || !beat || beat.status !== "published") {
    throw new Error("This beat is not available for requests.");
  }
  if (licenseType === "exclusive" && beat.is_exclusive_sold) {
    throw new Error("The exclusive license is no longer available.");
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from("beat_inquiries")
    .select("id", { head: true, count: "exact" })
    .eq("requester_email", requesterEmail)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 5) {
    throw new Error("Too many recent requests. Please try again later.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashBeatInquiryToken(token);
  const now = new Date().toISOString();

  const { data: inquiry, error: inquiryError } = await service
    .from("beat_inquiries")
    .insert({
      beat_id: beat.id,
      requester_name: requesterName,
      requester_email: requesterEmail,
      license_type: licenseType,
      status: "new",
      access_token_hash: tokenHash,
      metadata: { source: "website", beat_title: beat.title },
      last_message_at: now,
      updated_at: now
    })
    .select("id")
    .single();

  if (inquiryError || !inquiry) throw new Error(inquiryError?.message ?? "Could not create beat request.");

  const { error: messageError } = await service.from("beat_inquiry_messages").insert({
    inquiry_id: inquiry.id,
    sender_kind: "customer",
    body
  });

  if (messageError) {
    await service.from("beat_inquiries").delete().eq("id", inquiry.id);
    throw new Error(messageError.message);
  }

  redirect("/beats/request/" + token + "?created=1");
}

export async function replyBeatInquiryAction(formData: FormData) {
  const token = cleanText(formData.get("token"), 160);
  const body = cleanText(formData.get("message"), 5000);
  if (!body) throw new Error("Message is required.");

  const thread = await getBeatInquiryThreadByToken(token);
  if (!thread) throw new Error("Request not found.");
  if (thread.status === "closed" || thread.status === "declined") {
    throw new Error("This conversation is closed.");
  }

  const service = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await service.from("beat_inquiry_messages").insert({
    inquiry_id: thread.id,
    sender_kind: "customer",
    body
  });
  if (error) throw new Error(error.message);

  const nextStatus = thread.status === "awaiting_customer" ? "in_review" : thread.status;
  const update = await service.from("beat_inquiries").update({
    status: nextStatus,
    last_message_at: now,
    updated_at: now
  }).eq("id", thread.id);
  if (update.error) throw new Error(update.error.message);

  revalidatePath("/beats/request/" + token);
  redirect("/beats/request/" + token + "?sent=1");
}

export async function adminReplyBeatInquiryAction(formData: FormData) {
  const admin = await requireAdminPage();
  const inquiryId = cleanText(formData.get("inquiryId"), 80);
  const body = cleanText(formData.get("message"), 5000);
  if (!inquiryId || !body) throw new Error("Inquiry and message are required.");

  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data: inquiry } = await service.from("beat_inquiries").select("id,status").eq("id", inquiryId).maybeSingle();
  if (!inquiry) throw new Error("Beat request not found.");

  const { error } = await service.from("beat_inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_kind: "staff",
    sender_user_id: admin.id,
    body
  });
  if (error) throw new Error(error.message);

  const update = await service.from("beat_inquiries").update({
    status: "awaiting_customer",
    last_message_at: now,
    updated_at: now
  }).eq("id", inquiryId);
  if (update.error) throw new Error(update.error.message);

  revalidatePath("/admin/beat-requests");
}

export async function adminUpdateBeatInquiryStatusAction(formData: FormData) {
  await requireAdminPage();
  const inquiryId = cleanText(formData.get("inquiryId"), 80);
  const statusRaw = cleanText(formData.get("status"), 40);
  if (!INQUIRY_STATUSES.includes(statusRaw as any)) throw new Error("Invalid beat request status.");

  const service = createServiceClient();
  const { error } = await service.from("beat_inquiries").update({
    status: statusRaw,
    updated_at: new Date().toISOString()
  }).eq("id", inquiryId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/beat-requests");
}
