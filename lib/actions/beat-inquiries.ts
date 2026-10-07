"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { getBeatInquiryThreadByToken, hashBeatInquiryToken } from "@/lib/beat-inquiries";
import { createServiceClient } from "@/lib/supabase/service";
import { absoluteUrl } from "@/lib/utils";

const LICENSE_TYPES = ["basic", "standard", "premium", "exclusive", "unsure"] as const;
const INQUIRY_STATUSES = ["new", "in_review", "awaiting_customer", "negotiating", "paid", "fulfilled", "closed", "declined"] as const;

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

function parsePrivateStorageUrl(value: string): { bucket: string; path: string } | null {
  if (!value.startsWith("storage://")) return null;
  const body = value.slice("storage://".length);
  const slash = body.indexOf("/");
  if (slash <= 0 || slash >= body.length - 1) return null;
  return { bucket: body.slice(0, slash), path: body.slice(slash + 1) };
}

function parseMoneyToCents(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(/[$,\s]/g, "").trim();
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
    throw new Error("Invalid payment amount.");
  }
  return Math.round(amount * 100);
}

export async function adminMarkBeatInquiryPaidAction(formData: FormData) {
  const admin = await requireAdminPage();
  const inquiryId = cleanText(formData.get("inquiryId"), 80);
  const licenseRaw = cleanText(formData.get("licenseType"), 30).toLowerCase();
  const licenseType = ["basic", "standard", "premium", "exclusive"].includes(licenseRaw) ? licenseRaw : "";
  const paymentMethod = cleanText(formData.get("paymentMethod"), 60) || "external";
  const amount = parseMoneyToCents(formData.get("amount"));
  const maxDownloads = Math.max(1, Math.min(20, Number.parseInt(cleanText(formData.get("maxDownloads"), 4) || "3", 10) || 3));
  const expiresDays = Math.max(1, Math.min(90, Number.parseInt(cleanText(formData.get("expiresDays"), 4) || "14", 10) || 14));

  if (!inquiryId || !licenseType) throw new Error("Inquiry and license type are required.");

  const service = createServiceClient();
  const { data: inquiry, error: inquiryError } = await service
    .from("beat_inquiries")
    .select("id,beat_id,requester_name,requester_email,metadata")
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryError || !inquiry) throw new Error(inquiryError?.message ?? "Beat request not found.");

  const { data: beat, error: beatError } = await service
    .from("beats")
    .select("id,title,display_title,audio_url,is_exclusive_sold")
    .eq("id", inquiry.beat_id)
    .maybeSingle();

  if (beatError || !beat) throw new Error(beatError?.message ?? "Beat not found.");

  const storage = parsePrivateStorageUrl(String(beat.audio_url ?? ""));
  if (!storage) {
    throw new Error("This beat does not have a deliverable private master in Storage yet.");
  }

  if (licenseType === "exclusive" && beat.is_exclusive_sold) {
    throw new Error("This beat is already marked as exclusive sold.");
  }

  const { data: existingOrders, error: existingOrderError } = await service
    .from("orders")
    .select("id,price,status,metadata")
    .eq("product_type", "beat")
    .eq("product_id", beat.id)
    .contains("metadata", { inquiryId })
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingOrderError) throw new Error(existingOrderError.message);

  let orderId = existingOrders?.[0]?.id ? String(existingOrders[0].id) : "";
  if (!orderId) {
    const { data: license } = await service
      .from("licenses")
      .select("id")
      .eq("name", licenseType)
      .maybeSingle();

    let licenseVersionId: string | null = null;
    if (license?.id) {
      const { data: version } = await service
        .from("license_versions")
        .select("id")
        .eq("license_id", license.id)
        .eq("active", true)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      licenseVersionId = version?.id ? String(version.id) : null;
    }

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({
        email: String(inquiry.requester_email).toLowerCase(),
        product_type: "beat",
        product_id: beat.id,
        license_type: licenseType,
        price: amount,
        stripe_session_id: null,
        payment_provider: "external",
        paypal_order_id: null,
        paypal_capture_id: null,
        status: "paid",
        metadata: {
          source: "admin_external_payment",
          inquiryId,
          paymentMethod,
          requesterName: inquiry.requester_name,
          adminUserId: admin.id
        },
        license_version_id: licenseVersionId
      })
      .select("id")
      .single();

    if (orderError || !order) throw new Error(orderError?.message ?? "Could not record the external payment.");
    orderId = String(order.id);
  }

  const { data: existingDelivery, error: existingDeliveryError } = await service
    .from("order_deliveries")
    .select("id,token,expires_at,max_downloads,download_count")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingDeliveryError) throw new Error(existingDeliveryError.message);

  let token = existingDelivery?.token ? String(existingDelivery.token) : "";
  if (!token) {
    token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: deliveryError } = await service.from("order_deliveries").insert({
      order_id: orderId,
      token,
      bucket: storage.bucket,
      path: storage.path,
      license_pdf_path: null,
      expires_at: expiresAt,
      max_downloads: maxDownloads,
      download_count: 0
    });

    if (deliveryError) throw new Error(deliveryError.message);
  }

  if (licenseType === "exclusive" && !beat.is_exclusive_sold) {
    const { error: beatUpdateError } = await service
      .from("beats")
      .update({ is_exclusive_sold: true })
      .eq("id", beat.id)
      .eq("is_exclusive_sold", false);

    if (beatUpdateError) throw new Error(beatUpdateError.message);
  }

  const deliveryUrl = absoluteUrl("/beats/delivery/" + token);
  const beatName = String(beat.display_title || beat.title || "your beat");
  const messageBody =
    "Payment received. Your secure download for " + beatName + " is ready:\n\n" +
    deliveryUrl +
    "\n\nThis link is private, expires automatically, and has a limited number of downloads.";

  const { data: existingMessage } = await service
    .from("beat_inquiry_messages")
    .select("id")
    .eq("inquiry_id", inquiryId)
    .eq("sender_kind", "staff")
    .ilike("body", "%" + deliveryUrl + "%")
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existingMessage) {
    const { error: messageError } = await service.from("beat_inquiry_messages").insert({
      inquiry_id: inquiryId,
      sender_kind: "staff",
      sender_user_id: admin.id,
      body: messageBody
    });
    if (messageError) throw new Error(messageError.message);
  }

  const { error: inquiryUpdateError } = await service
    .from("beat_inquiries")
    .update({
      license_type: licenseType,
      status: "fulfilled",
      metadata: {
        ...(inquiry.metadata && typeof inquiry.metadata === "object" ? inquiry.metadata : {}),
        externalPayment: {
          amount,
          paymentMethod,
          orderId,
          deliveredAt: now
        }
      },
      last_message_at: now,
      updated_at: now
    })
    .eq("id", inquiryId);

  if (inquiryUpdateError) throw new Error(inquiryUpdateError.message);

  const { error: orderStatusError } = await service
    .from("orders")
    .update({ status: "fulfilled" })
    .eq("id", orderId);

  if (orderStatusError) throw new Error(orderStatusError.message);

  revalidatePath("/admin/beat-requests");
  revalidatePath("/beats");
}
