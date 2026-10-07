import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const service = createServiceClient();
  const { data: delivery, error } = await service
    .from("order_deliveries")
    .select("id,order_id,bucket,path,expires_at,max_downloads,download_count")
    .eq("token", token)
    .maybeSingle();

  if (error || !delivery) return new Response("Not found", { status: 404 });

  const { data: order } = await service
    .from("orders")
    .select("status,product_type")
    .eq("id", delivery.order_id)
    .maybeSingle();

  if (!order || order.product_type !== "beat" || order.status !== "fulfilled") {
    return new Response("Delivery unavailable", { status: 403 });
  }

  if (new Date(delivery.expires_at).getTime() <= Date.now()) {
    return new Response("Delivery link expired", { status: 410 });
  }

  const currentCount = Number(delivery.download_count ?? 0);
  const maxDownloads = Number(delivery.max_downloads ?? 0);
  if (currentCount >= maxDownloads) {
    return new Response("Download limit reached", { status: 410 });
  }

  const { data: signed, error: signError } = await service.storage
    .from(String(delivery.bucket))
    .createSignedUrl(String(delivery.path), 90, { download: true });

  if (signError || !signed?.signedUrl) {
    return new Response("File unavailable", { status: 404 });
  }

  const nextCount = currentCount + 1;
  const { data: updated, error: updateError } = await service
    .from("order_deliveries")
    .update({
      download_count: nextCount,
      last_downloaded_at: new Date().toISOString()
    })
    .eq("id", delivery.id)
    .eq("download_count", currentCount)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return new Response("Please try the download again", { status: 409 });
  }

  const response = NextResponse.redirect(signed.signedUrl, 307);
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}
