import { NextResponse } from "next/server";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockTicketOrders } from "@/lib/mock-data";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ orders: mockTicketOrders });
  }

  try {
    const snapshot = await getCurrentUserRoleSnapshot();
    if (!snapshot) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!snapshot.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = createServiceClient();
    const { data, error } = await service
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
