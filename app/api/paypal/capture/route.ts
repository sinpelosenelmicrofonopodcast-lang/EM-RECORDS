import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import { capturePayPalOrder } from "@/lib/paypal";
import { fulfillPayPalOrder } from "@/lib/paypal-fulfillment";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = String(url.searchParams.get("token") ?? "").trim();

  if (!orderId) {
    return NextResponse.redirect(absoluteUrl("/events?error=paypal_token"), 303);
  }

  try {
    const order = await capturePayPalOrder(orderId);
    const result = await fulfillPayPalOrder(order);

    if (result.kind === "ticket") {
      return NextResponse.redirect(absoluteUrl("/events?checkout=success&provider=paypal"), 303);
    }

    return NextResponse.redirect(absoluteUrl("/?checkout=success&provider=paypal"), 303);
  } catch {
    return NextResponse.redirect(absoluteUrl("/events?error=paypal_capture"), 303);
  }
}
