import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Secure Beat Delivery",
  description: "Private EM Records beat delivery.",
  path: "/beats/delivery",
  noIndex: true
});

export default async function BeatDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) notFound();

  const service = createServiceClient();
  const { data: delivery, error } = await service
    .from("order_deliveries")
    .select("order_id,expires_at,max_downloads,download_count")
    .eq("token", token)
    .maybeSingle();

  if (error || !delivery) notFound();

  const { data: order } = await service
    .from("orders")
    .select("product_id,email,license_type,price,status")
    .eq("id", delivery.order_id)
    .maybeSingle();

  if (!order || order.status !== "fulfilled") notFound();

  const { data: beat } = await service
    .from("beats")
    .select("title,display_title")
    .eq("id", order.product_id)
    .maybeSingle();

  const expired = new Date(delivery.expires_at).getTime() <= Date.now();
  const remaining = Math.max(0, Number(delivery.max_downloads) - Number(delivery.download_count));
  const unavailable = expired || remaining <= 0;
  const beatTitle = String(beat?.display_title || beat?.title || "Beat");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20 md:px-10">
      <Link href="/beats" className="text-xs uppercase tracking-[0.18em] text-gold hover:underline">← EM Records Beats</Link>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Secure Delivery</p>
        <h1 className="mt-3 font-display text-4xl text-white">{beatTitle}</h1>
        <p className="mt-3 text-sm text-white/60">
          {String(order.license_type || "beat").toUpperCase()} license · {order.email}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Downloads remaining</p>
            <p className="mt-2 font-display text-3xl text-white">{remaining}</p>
          </div>
          <div className="rounded-2xl border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Expires</p>
            <p className="mt-2 text-sm font-semibold text-white">{new Date(delivery.expires_at).toLocaleString()}</p>
          </div>
        </div>

        {unavailable ? (
          <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100/80">
            This delivery link is no longer active. Contact EM Records through your private request thread if you need help.
          </div>
        ) : (
          <>
            <a
              href={"/api/beat-delivery/" + token}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] text-black"
            >
              Download beat
            </a>
            <p className="mt-3 text-center text-xs leading-relaxed text-white/35">
              This link is private. Each successful download counts toward the delivery limit.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
