import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import {
  createPayPalOrder,
  getPayPalApprovalUrl,
  isPayPalConfigured
} from "@/lib/paypal";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.redirect(absoluteUrl("/events?error=paypal_config"), 303);
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const quantityRaw = Number(formData.get("quantity") ?? 1);
  const quantity = Number.isInteger(quantityRaw)
    ? Math.min(Math.max(quantityRaw, 1), 10)
    : 1;

  if (!eventId) {
    return NextResponse.redirect(absoluteUrl("/events?error=missing_event"), 303);
  }

  try {
    const service = createServiceClient();
    const { data: event, error } = await service
      .from("events")
      .select("id,title,ticket_price_cents,ticket_currency,status")
      .eq("id", eventId)
      .maybeSingle();

    if (
      error ||
      !event ||
      event.status !== "upcoming" ||
      !Number.isInteger(Number(event.ticket_price_cents)) ||
      Number(event.ticket_price_cents) <= 0
    ) {
      return NextResponse.redirect(absoluteUrl("/events?error=unavailable"), 303);
    }

    const amountTotal = Number(event.ticket_price_cents) * quantity;
    const currency = String(event.ticket_currency ?? "USD").toUpperCase();
    const referenceId = `ticket:${event.id}:${crypto.randomUUID()}`;

    const order = await createPayPalOrder({
      amountCents: amountTotal,
      currency,
      description: `${event.title} · ${quantity} ticket${quantity === 1 ? "" : "s"}`,
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
        kind: "ticket",
        event_id: event.id,
        quantity,
        amount_total: amountTotal,
        currency,
        status: "created",
        metadata: {
          eventTitle: event.title,
          referenceId
        }
      });

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    return NextResponse.redirect(approvalUrl, 303);
  } catch {
    return NextResponse.redirect(absoluteUrl("/events?error=paypal"), 303);
  }
}
