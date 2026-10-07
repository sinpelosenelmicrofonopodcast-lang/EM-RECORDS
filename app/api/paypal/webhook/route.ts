import { NextResponse } from "next/server";
import {
  capturePayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhook
} from "@/lib/paypal";
import { fulfillPayPalOrder } from "@/lib/paypal-fulfillment";
import { createServiceClient } from "@/lib/supabase/service";

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
};

function getRelatedOrderId(event: PayPalWebhookEvent) {
  return (
    event.resource?.supplementary_data?.related_ids?.order_id ??
    (event.event_type === "CHECKOUT.ORDER.APPROVED" ? event.resource?.id : undefined) ??
    null
  );
}

async function updateSessionStatus(orderId: string, status: string) {
  const service = createServiceClient();
  await service
    .from("paypal_payment_sessions")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("paypal_order_id", orderId)
    .neq("status", "completed");
}

export async function POST(request: Request) {
  let event: PayPalWebhookEvent;

  try {
    event = (await request.json()) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyPayPalWebhook(request.headers, event);
  } catch {
    verified = false;
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 401 });
  }

  const eventType = String(event.event_type ?? "");
  const orderId = getRelatedOrderId(event);

  try {
    if (eventType === "CHECKOUT.ORDER.APPROVED" && orderId) {
      await updateSessionStatus(orderId, "approved");
      const order = await capturePayPalOrder(orderId);
      await fulfillPayPalOrder(order);
    } else if (eventType === "PAYMENT.CAPTURE.COMPLETED" && orderId) {
      const order = await getPayPalOrder(orderId);
      await fulfillPayPalOrder(order);
    } else if (
      ["PAYMENT.CAPTURE.DENIED", "CHECKOUT.PAYMENT-APPROVAL.REVERSED"].includes(eventType) &&
      orderId
    ) {
      await updateSessionStatus(orderId, "denied");
    }
  } catch {
    // Return 500 so PayPal retries transient fulfillment failures.
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
