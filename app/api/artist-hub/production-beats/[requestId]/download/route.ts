import { NextResponse } from "next/server";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const ctx = await getCurrentUserRoleSnapshot();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const service = createServiceClient();
  const { data: request } = await service.from("beat_access_requests").select("*").eq("id", requestId).maybeSingle();
  if (!request || request.status !== "approved") return NextResponse.json({ error: "Access not approved" }, { status: 403 });

  const { data: profile } = await service.from("artist_profiles").select("id,user_id,artist_id").eq("id", request.artist_profile_id).maybeSingle();
  let isMember = false;
  if (profile?.artist_id) {
    const { data: membership } = await service.from("artist_members").select("id").eq("artist_id", profile.artist_id).eq("user_id", ctx.user.id).maybeSingle();
    isMember = Boolean(membership);
  }
  if (!ctx.isAdmin && profile?.user_id !== ctx.user.id && !isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!request.contract_id) return NextResponse.json({ error: "Agreement required" }, { status: 403 });
  const { data: contract } = await service.from("contracts").select("status").eq("id", request.contract_id).maybeSingle();
  if (contract?.status !== "fully_executed") return NextResponse.json({ error: "Agreement not fully executed" }, { status: 403 });

  const { data: grant } = await service.from("beat_access_grants").select("*").eq("request_id", request.id).maybeSingle();
  if (!grant || grant.revoked_at) return NextResponse.json({ error: "Grant unavailable" }, { status: 403 });
  if (grant.expires_at && new Date(grant.expires_at) <= new Date()) return NextResponse.json({ error: "Grant expired" }, { status: 403 });
  if (Number(grant.download_count) >= Number(grant.max_downloads)) return NextResponse.json({ error: "Download limit reached" }, { status: 403 });
  if (!grant.storage_path) return NextResponse.json({ error: "Protected file not configured" }, { status: 404 });

  const { data: signed, error } = await service.storage.from(grant.storage_bucket).createSignedUrl(grant.storage_path, 60);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "Unable to create protected download" }, { status: 500 });

  await service.from("beat_access_grants").update({
    download_count: Number(grant.download_count) + 1,
    last_downloaded_at: new Date().toISOString()
  }).eq("id", grant.id);

  return NextResponse.redirect(signed.signedUrl);
}
