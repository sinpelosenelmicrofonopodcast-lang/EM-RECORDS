"use client";

import { useEffect, useState } from "react";
import type { TicketOrder } from "@/lib/types";

type Props = {
  initialOrders: TicketOrder[];
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

export function LiveSalesTable({ initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/admin/sales", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { orders?: TicketOrder[] };
        if (active && data.orders) {
          setOrders(data.orders);
        }
      } catch {
        // no-op
      }
    }

    const interval = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-white/45">
          <tr>
            <th className="pb-3">Event</th>
            <th className="pb-3">Buyer</th>
            <th className="pb-3">Qty</th>
            <th className="pb-3">Amount</th>
            <th className="pb-3">QR</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-white/10">
              <td className="py-3">{order.eventTitle}</td>
              <td className="py-3">{order.buyerEmail}</td>
              <td className="py-3">{order.quantity}</td>
              <td className="py-3">{formatMoney(order.amountTotal, order.currency)}</td>
              <td className="py-3">
                <a href={`/api/tickets/validate?code=${encodeURIComponent(order.qrCodeValue)}`} className="text-gold underline underline-offset-4">
                  Validate
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
