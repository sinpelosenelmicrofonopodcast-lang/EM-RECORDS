import QRCode from "qrcode";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const stripe = getStripeClient();
  const payload = await request.text();
  const headerList = await headers();
  const signature = headerList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" && isSupabaseConfigured()) {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const supabase = createServiceClient();
      const qrCodeValue = `em-${session.id}-${crypto.randomUUID()}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeValue);

      await supabase.from("ticket_orders").upsert(
        {
          stripe_session_id: session.id,
          event_id: session.metadata?.eventId ?? null,
          event_title: session.metadata?.eventTitle ?? "EM Event",
          buyer_email: session.customer_details?.email ?? session.customer_email ?? "unknown@buyer.com",
          quantity: Number(session.metadata?.quantity ?? 1),
          amount_total: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          qr_code_value: qrCodeValue,
          qr_code_data_url: qrCodeDataUrl,
          status: "paid"
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: false }
      );
    } catch {
      return NextResponse.json({ received: true, warning: "Persist failed" });
    }
  }

  return NextResponse.json({ received: true });
}
