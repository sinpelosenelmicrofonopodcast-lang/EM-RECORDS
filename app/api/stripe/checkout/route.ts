import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const formData = await request.formData();

  const priceId = String(formData.get("priceId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const eventTitle = String(formData.get("eventTitle") ?? "EM Event").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!priceId) {
    return NextResponse.redirect(absoluteUrl("/events?error=missing_price"));
  }

  try {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        }
      ],
      success_url: absoluteUrl("/events?checkout=success"),
      cancel_url: absoluteUrl("/events?checkout=cancelled"),
      metadata: {
        eventId,
        eventTitle,
        quantity: String(Number.isFinite(quantity) && quantity > 0 ? quantity : 1)
      }
    });

    if (!session.url) {
      return NextResponse.redirect(absoluteUrl("/events?error=session_url"));
    }

    return NextResponse.redirect(session.url);
  } catch {
    return NextResponse.redirect(absoluteUrl("/events?error=stripe"));
  }
}
