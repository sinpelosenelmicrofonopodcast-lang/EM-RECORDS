import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ valid: false, message: "Missing QR code." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ valid: true, message: "Valid ticket (mock mode)." });
  }

  try {
    const supabase = createServiceClient();

    const { data } = await supabase
      .from("ticket_orders")
      .select("id, status, event_title, buyer_email")
      .eq("qr_code_value", code)
      .maybeSingle();

    if (!data || data.status !== "paid") {
      return NextResponse.json({ valid: false, message: "Invalid or inactive ticket." }, { status: 404 });
    }

    await supabase.from("ticket_orders").update({ validated_at: new Date().toISOString() }).eq("id", data.id);

    return NextResponse.json({
      valid: true,
      message: "Ticket validated.",
      eventTitle: data.event_title,
      buyerEmail: data.buyer_email
    });
  } catch {
    return NextResponse.json({ valid: false, message: "Validation failed." }, { status: 500 });
  }
}
