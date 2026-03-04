import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog, parseStorageUrl } from "@/lib/artist-hub/service";

async function resolveDownloadUrl(service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>, raw: string): Promise<string | null> {
  const parsed = parseStorageUrl(raw);
  if (!parsed) return raw;

  const { data, error } = await service.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 10);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const reportId = searchParams.get("reportId");

  if (!documentId && !reportId) {
    return errorJson("documentId or reportId is required.");
  }

  if (documentId) {
    const { data: doc, error } = await auth.service
      .from("documents")
      .select("id,artist_id,url,type")
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !doc) return errorJson("Document not found.", 404);
    if (!hasArtistAccess(auth.ctx, String(doc.artist_id))) return errorJson("Forbidden", 403);

    const url = await resolveDownloadUrl(auth.service, String(doc.url));
    if (!url) return errorJson("Unable to generate download URL.", 400);

    const action = doc.type === "epk" ? "download_media_kit" : "download_document";
    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: String(doc.artist_id),
      action,
      entityType: "document",
      entityId: String(doc.id),
      details: {
        documentType: String(doc.type),
        label: String(doc.type)
      }
    }).catch(() => undefined);

    return NextResponse.redirect(url);
  }

  const { data: report, error } = await auth.service.from("reports").select("id,artist_id,url,month,version").eq("id", reportId).maybeSingle();
  if (error || !report) return errorJson("Report not found.", 404);
  if (!hasArtistAccess(auth.ctx, String(report.artist_id))) return errorJson("Forbidden", 403);

  const url = await resolveDownloadUrl(auth.service, String(report.url));
  if (!url) return errorJson("Unable to generate download URL.", 400);

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: String(report.artist_id),
    action: "download_artist_report",
    entityType: "report",
    entityId: String(report.id),
    details: {
      month: String(report.month),
      version: Number(report.version),
      label: `report-${report.month}`
    }
  }).catch(() => undefined);

  return NextResponse.redirect(url);
}
