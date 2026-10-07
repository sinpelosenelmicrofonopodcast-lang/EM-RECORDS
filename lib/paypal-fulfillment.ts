import QRCode from "qrcode";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getPayPalBuyerEmail,
  getPayPalCapture,
  type PayPalOrder
} from "@/lib/paypal";

function paypalAmountToCents(value: string | undefined) {
  const amount = Number(value ?? "NaN");
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid PayPal capture amount.");
  }
  return Math.round(amount * 100);
}

export async function fulfillPayPalOrder(order: PayPalOrder) {
  const service = createServiceClient();

  const { data: session, error: sessionError } = await service
    .from("paypal_payment_sessions")
    .select("*")
    .eq("paypal_order_id", order.id)
    .maybeSingle();

  if (sessionError || !session) {
    throw new Error("PayPal payment session not found.");
  }

  if (session.status === "completed") {
    return {
      kind: String(session.kind),
      eventId: session.event_id ? String(session.event_id) : null,
      beatId: session.beat_id ? String(session.beat_id) : null,
      captureId: session.paypal_capture_id ? String(session.paypal_capture_id) : null
    };
  }

  const capture = getPayPalCapture(order);
  if (!capture || capture.status !== "COMPLETED") {
    throw new Error("PayPal payment is not completed.");
  }

  const capturedCents = paypalAmountToCents(capture.amount?.value);
  const capturedCurrency = String(capture.amount?.currency_code ?? "").toUpperCase();
  const expectedCurrency = String(session.currency ?? "USD").toUpperCase();

  if (capturedCents !== Number(session.amount_total) || capturedCurrency !== expectedCurrency) {
    throw new Error("PayPal captured amount does not match the payment session.");
  }

  const buyerEmail =
    getPayPalBuyerEmail(order) ??
    (session.buyer_email ? String(session.buyer_email) : null) ??
    `paypal-${order.id.toLowerCase()}@payments.local`;

  if (session.kind === "ticket") {
    const { data: existingTicket } = await service
      .from("ticket_orders")
      .select("id")
      .eq("paypal_order_id", order.id)
      .maybeSingle();

    if (!existingTicket) {
      const { data: event, error: eventError } = await service
        .from("events")
        .select("id,title")
        .eq("id", session.event_id)
        .maybeSingle();

      if (eventError || !event) {
        throw new Error("Event for PayPal ticket order not found.");
      }

      const qrCodeValue = `em-paypal-${order.id}-${crypto.randomUUID()}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeValue);

      const { error: insertError } = await service.from("ticket_orders").insert({
        stripe_session_id: null,
        payment_provider: "paypal",
        paypal_order_id: order.id,
        paypal_capture_id: capture.id,
        event_id: event.id,
        event_title: event.title,
        buyer_email: buyerEmail,
        quantity: Number(session.quantity ?? 1),
        amount_total: capturedCents,
        currency: capturedCurrency,
        qr_code_value: qrCodeValue,
        qr_code_data_url: qrCodeDataUrl,
        status: "paid"
      });

      if (insertError) {
        const { data: racedTicket } = await service
          .from("ticket_orders")
          .select("id")
          .eq("paypal_order_id", order.id)
          .maybeSingle();

        if (!racedTicket) {
          throw new Error(insertError.message);
        }
      }
    }
  } else if (session.kind === "beat") {
    const licenseType = String(session.license_type ?? "").toLowerCase();
    const allowedLicenseTypes = ["basic", "standard", "premium", "exclusive"];

    if (!allowedLicenseTypes.includes(licenseType)) {
      throw new Error("Invalid beat license type.");
    }

    const { data: existingOrder } = await service
      .from("orders")
      .select("id")
      .eq("paypal_order_id", order.id)
      .maybeSingle();

    if (!existingOrder) {
      const { data: license } = await service
        .from("licenses")
        .select("id")
        .eq("name", licenseType)
        .maybeSingle();

      let licenseVersionId: string | null = null;
      if (license?.id) {
        const { data: version } = await service
          .from("license_versions")
          .select("id")
          .eq("license_id", license.id)
          .eq("active", true)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        licenseVersionId = version?.id ? String(version.id) : null;
      }

      const { error: orderError } = await service.from("orders").insert({
        email: buyerEmail,
        product_type: "beat",
        product_id: session.beat_id,
        license_type: licenseType,
        price: capturedCents,
        stripe_session_id: null,
        payment_provider: "paypal",
        paypal_order_id: order.id,
        paypal_capture_id: capture.id,
        status: "paid",
        metadata: {
          provider: "paypal",
          paypalOrderId: order.id,
          paypalCaptureId: capture.id
        },
        license_version_id: licenseVersionId
      });

      if (orderError) {
        const { data: racedOrder } = await service
          .from("orders")
          .select("id")
          .eq("paypal_order_id", order.id)
          .maybeSingle();

        if (!racedOrder) {
          throw new Error(orderError.message);
        }
      }

      if (licenseType === "exclusive") {
        const { error: beatUpdateError } = await service
          .from("beats")
          .update({ is_exclusive_sold: true })
          .eq("id", session.beat_id)
          .eq("is_exclusive_sold", false);

        if (beatUpdateError) {
          throw new Error(beatUpdateError.message);
        }
      }
    }
  } else {
    throw new Error("Unsupported PayPal payment kind.");
  }

  const { error: updateError } = await service
    .from("paypal_payment_sessions")
    .update({
      status: "completed",
      paypal_capture_id: capture.id,
      buyer_email: buyerEmail,
      updated_at: new Date().toISOString()
    })
    .eq("id", session.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    kind: String(session.kind),
    eventId: session.event_id ? String(session.event_id) : null,
    beatId: session.beat_id ? String(session.beat_id) : null,
    captureId: capture.id
  };
}
