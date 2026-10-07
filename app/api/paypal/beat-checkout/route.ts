import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import {
  createPayPalOrder,
  getPayPalApprovalUrl,
  isPayPalConfigured
} from "@/lib/paypal";
import { createServiceClient } from "@/lib/supabase/service";

const PRICE_COLUMN: Record<string, string> = {
  basic: "price_basic",
  standard: "price_standard",
  premium: "price_premium",
  exclusive: "price_exclusive"
};

export async function POST(request: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.redirect(absoluteUrl("/?error=paypal_config"), 303);
  }

  const formData = await request.formData();
  const beatId = String(formData.get("beatId") ?? "").trim();
  const licenseType = String(formData.get("licenseType") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const priceColumn = PRICE_COLUMN[licenseType];

  if (!beatId || !priceColumn || !email) {
    return NextResponse.redirect(absoluteUrl("/?error=invalid_beat_checkout"), 303);
  }

  try {
    const service = createServiceClient();

    await service
      .from("paypal_payment_sessions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString()
      })
      .eq("kind", "beat")
      .eq("license_type", "exclusive")
      .in("status", ["created", "approved"])
      .lt("expires_at", new Date().toISOString());

    const { data: beat, error } = await service
      .from("beats")
      .select("id,title,status,is_exclusive_sold,price_basic,price_standard,price_premium,price_exclusive")
      .eq("id", beatId)
      .maybeSingle();

    if (error || !beat || beat.status !== "published") {
      return NextResponse.redirect(absoluteUrl("/?error=beat_unavailable"), 303);
    }

    if (licenseType === "exclusive" && beat.is_exclusive_sold) {
      return NextResponse.redirect(absoluteUrl("/?error=exclusive_sold"), 303);
    }

    const amountTotal = Number((beat as Record<string, unknown>)[priceColumn] ?? 0);
    if (!Number.isInteger(amountTotal) || amountTotal <= 0) {
      return NextResponse.redirect(absoluteUrl("/?error=beat_price"), 303);
    }

    const referenceId = `beat:${beat.id}:${licenseType}:${crypto.randomUUID()}`;
    const order = await createPayPalOrder({
      amountCents: amountTotal,
      currency: "USD",
      description: `${beat.title} · ${licenseType} license`,
      referenceId,
      returnUrl: absoluteUrl("/api/paypal/capture"),
      cancelUrl: absoluteUrl("/api/paypal/cancel")
    });

    const approvalUrl = getPayPalApprovalUrl(order);
    if (!order.id || !approvalUrl) {
      throw new Error("PayPal approval URL missing.");
    }

    const { error: sessionError } = await service
      .from("paypal_payment_sessions")
      .insert({
        paypal_order_id: order.id,
        kind: "beat",
        beat_id: beat.id,
        license_type: licenseType,
        buyer_email: email,
        quantity: 1,
        amount_total: amountTotal,
        currency: "USD",
        status: "created",
        metadata: {
          beatTitle: beat.title,
          referenceId
        }
      });

    if (sessionError) {
      if (licenseType === "exclusive") {
        return NextResponse.redirect(absoluteUrl("/?error=exclusive_reserved"), 303);
      }
      throw new Error(sessionError.message);
    }

    return NextResponse.redirect(approvalUrl, 303);
  } catch {
    return NextResponse.redirect(absoluteUrl("/?error=paypal"), 303);
  }
}
