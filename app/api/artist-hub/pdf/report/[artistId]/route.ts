import { NextResponse } from "next/server";
import { buildArtistReportPdf } from "@/lib/artist-hub/pdf";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { getArtistByIdForContext, hasArtistAccess, insertAuditLog, resolveMaybeSignedUrl, smartlinkUrl, toStorageUrl } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ artistId: string }> };

function monthBounds(month: string): { start: string; end: string } {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNum = Number(monthRaw);
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { artistId } = await params;

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as { month?: string } | null;
  const month = body?.month && /^\d{4}-\d{2}$/.test(body.month) ? body.month : new Date().toISOString().slice(0, 7);

  try {
    const artist = await getArtistByIdForContext(auth.ctx, artistId);
    if (!artist) return errorJson("Artist not found.", 404);

    const { start, end } = monthBounds(month);

    const [songsRes, releasesRes, bookingsRes, tasksRes, regsRes, checklistRes, reportsRes, auditRes] = await Promise.all([
      auth.service.from("songs").select("id,title").eq("artist_id", artistId),
      auth.service.from("releases").select("id,title,release_date,smartlink_slug").eq("artist_id", artistId).gte("release_date", start.slice(0, 10)).lt("release_date", end.slice(0, 10)),
      auth.service.from("booking_requests").select("status").eq("artist_id", artistId).gte("created_at", start).lt("created_at", end),
      auth.service.from("artist_tasks").select("status").eq("artist_id", artistId),
      auth.service.from("registrations").select("song_id,org,status"),
      auth.service.from("launch_checklists").select("song_id,ready_score").gte("updated_at", start).lt("updated_at", end),
      auth.service.from("reports").select("version").eq("artist_id", artistId).eq("month", month).order("version", { ascending: false }).limit(1),
      auth.service
        .from("audit_log")
        .select("action,details")
        .eq("artist_id", artistId)
        .in("action", ["download_media_kit", "download_artist_report", "download_document"])
        .gte("created_at", start)
        .lt("created_at", end)
    ]);

    const songs = songsRes.data ?? [];
    const songById = new Map(songs.map((song: any) => [String(song.id), String(song.title)]));

    const registrations = (regsRes.data ?? [])
      .filter((row: any) => songById.has(String(row.song_id)))
      .slice(0, 20)
      .map((row: any) => ({
        song: songById.get(String(row.song_id)) ?? "Unknown",
        org: String(row.org),
        status: String(row.status)
      }));

    const bookingRows = bookingsRes.data ?? [];
    const bookingSummary = {
      total: bookingRows.length,
      confirmed: bookingRows.filter((row: any) => row.status === "confirmed" || row.status === "done").length,
      pipeline: bookingRows.filter((row: any) => ["new", "in_review", "negotiating"].includes(String(row.status))).length
    };

    const taskRows = tasksRes.data ?? [];
    const tasks = {
      done: taskRows.filter((row: any) => row.status === "done").length,
      pending: taskRows.filter((row: any) => row.status !== "done").length
    };

    const checklistRows = (checklistRes.data ?? []).filter((row: any) => row.song_id && songById.has(String(row.song_id)));
    const readyScoreAverage = checklistRows.length
      ? Math.round(checklistRows.reduce((sum: number, row: any) => sum + Number(row.ready_score ?? 0), 0) / checklistRows.length)
      : 0;

    const assetCounts = new Map<string, number>();
    for (const row of auditRes.data ?? []) {
      const label = String((row.details as any)?.label ?? (row.details as any)?.documentType ?? "Asset");
      assetCounts.set(label, (assetCounts.get(label) ?? 0) + 1);
    }

    const topAssets = [...assetCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, downloads]) => ({ label, downloads }));

    const smartlinks = (releasesRes.data ?? [])
      .filter((row: any) => row.smartlink_slug)
      .map((row: any) => ({
        title: String(row.title),
        url: smartlinkUrl(String(row.smartlink_slug))
      }));

    const pdf = await buildArtistReportPdf({
      artistName: artist.stageName || artist.name,
      month,
      releaseCount: (releasesRes.data ?? []).length,
      bookingSummary,
      tasks,
      registrations,
      readyScoreAverage,
      topAssets,
      smartlinks
    });

    const nextVersion = Number(reportsRes.data?.[0]?.version ?? 0) + 1;
    const filename = `${artist.slug}-artist-report-${month}-v${nextVersion}.pdf`;
    const path = `${artistId}/reports/${month}/${filename}`;

    const { error: uploadError } = await auth.service.storage.from("artist-hub-pdfs").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true
    });

    if (uploadError) {
      return errorJson(uploadError.message, 400);
    }

    const storageUrl = toStorageUrl("artist-hub-pdfs", path);

    const { data: report, error: reportError } = await auth.service
      .from("reports")
      .insert({
        artist_id: artistId,
        month,
        url: storageUrl,
        version: nextVersion,
        created_by: auth.ctx.user.id
      })
      .select("*")
      .single();

    if (reportError || !report) {
      return errorJson(reportError?.message ?? "Failed to register report.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId,
      action: "generate_artist_report_pdf",
      entityType: "report",
      entityId: String(report.id),
      details: {
        month,
        version: nextVersion,
        path
      }
    }).catch(() => undefined);

    const downloadUrl = await resolveMaybeSignedUrl(storageUrl, 60 * 60 * 12);

    return NextResponse.json({
      report: {
        id: report.id,
        month: report.month,
        version: report.version,
        url: report.url,
        downloadUrl
      }
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to generate monthly report.", 500);
  }
}
