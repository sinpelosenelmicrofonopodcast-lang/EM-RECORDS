import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockTicketOrders } from "@/lib/mock-data";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ orders: mockTicketOrders });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.user_metadata?.role !== "admin") {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

      if (profileError || !profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("ticket_orders")
      .select("id, event_id, event_title, buyer_email, quantity, amount_total, currency, qr_code_value, qr_code_data_url, status, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      orders: (data ?? []).map((row) => ({
        id: row.id,
        eventId: row.event_id,
        eventTitle: row.event_title,
        buyerEmail: row.buyer_email,
        quantity: row.quantity,
        amountTotal: row.amount_total,
        currency: row.currency,
        qrCodeValue: row.qr_code_value,
        qrCodeDataUrl: row.qr_code_data_url,
        status: row.status,
        createdAt: row.created_at
      }))
    });
  } catch {
    return NextResponse.json({ error: "Sales endpoint failed." }, { status: 500 });
  }
}
