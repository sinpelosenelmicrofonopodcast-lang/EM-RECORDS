import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = String(url.searchParams.get("token") ?? "").trim();

  if (!orderId) {
    return NextResponse.redirect(absoluteUrl("/events?checkout=cancelled"), 303);
  }

  try {
    const service = createServiceClient();
    const { data: session } = await service
      .from("paypal_payment_sessions")
      .select("id,kind")
      .eq("paypal_order_id", orderId)
      .maybeSingle();

    if (session?.id) {
      await service
        .from("paypal_payment_sessions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", session.id)
        .in("status", ["created", "approved"]);
    }

    if (session?.kind === "beat") {
      return NextResponse.redirect(absoluteUrl("/?checkout=cancelled&provider=paypal"), 303);
    }
  } catch {
    // A cancellation should always return the buyer to the site.
  }

  return NextResponse.redirect(absoluteUrl("/events?checkout=cancelled&provider=paypal"), 303);
}
