import { NextResponse } from "next/server";
import { calculateReadyScore } from "@/lib/artist-hub/ready-score";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ songId: string }> };

async function buildLaunchInput(service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>, songId: string) {
  const { data: song, error: songError } = await service.from("songs").select("*").eq("id", songId).maybeSingle();
  if (songError || !song) {
    throw new Error("Song not found.");
  }

  const [splitsRes, regRes, checklistRes, mediaKitRes, releaseRes, smartlinkRes] = await Promise.all([
    service.from("splits").select("*").eq("song_id", songId),
    service.from("registrations").select("*").eq("song_id", songId),
    service.from("launch_checklists").select("*").eq("song_id", songId).maybeSingle(),
    service.from("media_kits").select("id").eq("artist_id", song.artist_id).maybeSingle(),
    song.release_id ? service.from("releases").select("id,release_date,cover_url").eq("id", song.release_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
    song.release_id ? service.from("smartlinks").select("id").eq("release_id", song.release_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any)
  ]);

  const splits = splitsRes.data ?? [];
  const regs = regRes.data ?? [];
  const checklist = checklistRes.data;

  const findRegStatus = (org: string) => regs.find((row: any) => row.org === org)?.status ?? null;

  const launchInput = {
    isrc: song.isrc,
    iswc: song.iswc,
    masterSplitsConfirmed: Boolean(splits.find((row: any) => row.kind === "master" && row.status === "confirmed")),
    publishingSplitsConfirmed: Boolean(splits.find((row: any) => row.kind === "publishing" && row.status === "confirmed")),
    coverArt: Boolean((releaseRes as any)?.data?.cover_url),
    releaseDate: (releaseRes as any)?.data?.release_date ?? null,
    mediaKitReady: Boolean(mediaKitRes.data?.id),
    smartlinkReady: Boolean((smartlinkRes as any)?.data?.id),
    bmiStatus: findRegStatus("bmi"),
    mlcStatus: findRegStatus("mlc"),
    songtrustStatus: findRegStatus("songtrust"),
    soundexchangeStatus: findRegStatus("soundexchange"),
    distrokidStatus: findRegStatus("distrokid"),
    contentIdStatus: findRegStatus("contentid")
  };

  const score = calculateReadyScore(launchInput);

  return {
    song,
    checklist,
    launchInput,
    score,
    registrations: regs,
    splits
  };
}

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { songId } = await params;

  try {
    const detail = await buildLaunchInput(auth.service, songId);

    if (!hasArtistAccess(auth.ctx, String(detail.song.artist_id))) {
      return errorJson("Forbidden", 403);
    }

    return NextResponse.json({
      song: detail.song,
      checklist: detail.checklist,
      calculatedItems: detail.launchInput,
      readyScore: detail.score,
      registrations: detail.registrations,
      splits: detail.splits
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load launch data.", 404);
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { songId } = await params;

  const body = (await request.json().catch(() => null)) as
    | {
        notes?: string;
        status?: "draft" | "in_progress" | "ready" | "blocked";
        dueDate?: string | null;
        ownerUserId?: string | null;
        items?: Record<string, unknown>;
      }
    | null;

  try {
    const detail = await buildLaunchInput(auth.service, songId);

    if (!hasArtistAccess(auth.ctx, String(detail.song.artist_id))) {
      return errorJson("Forbidden", 403);
    }

    const mergedItems = {
      ...(detail.checklist?.items ?? {}),
      ...detail.launchInput,
      ...(body?.items ?? {})
    };

    const readyScore = calculateReadyScore({
      isrc: String(mergedItems.isrc ?? detail.launchInput.isrc ?? "") || null,
      iswc: String(mergedItems.iswc ?? detail.launchInput.iswc ?? "") || null,
      masterSplitsConfirmed: Boolean(mergedItems.masterSplitsConfirmed ?? detail.launchInput.masterSplitsConfirmed),
      publishingSplitsConfirmed: Boolean(mergedItems.publishingSplitsConfirmed ?? detail.launchInput.publishingSplitsConfirmed),
      coverArt: Boolean(mergedItems.coverArt ?? detail.launchInput.coverArt),
      releaseDate: String(mergedItems.releaseDate ?? detail.launchInput.releaseDate ?? "") || null,
      mediaKitReady: Boolean(mergedItems.mediaKitReady ?? detail.launchInput.mediaKitReady),
      smartlinkReady: Boolean(mergedItems.smartlinkReady ?? detail.launchInput.smartlinkReady),
      bmiStatus: String(mergedItems.bmiStatus ?? detail.launchInput.bmiStatus ?? "") || null,
      mlcStatus: String(mergedItems.mlcStatus ?? detail.launchInput.mlcStatus ?? "") || null,
      songtrustStatus: String(mergedItems.songtrustStatus ?? detail.launchInput.songtrustStatus ?? "") || null,
      soundexchangeStatus: String(mergedItems.soundexchangeStatus ?? detail.launchInput.soundexchangeStatus ?? "") || null,
      distrokidStatus: String(mergedItems.distrokidStatus ?? detail.launchInput.distrokidStatus ?? "") || null,
      contentIdStatus: String(mergedItems.contentIdStatus ?? detail.launchInput.contentIdStatus ?? "") || null
    });

    const payload = {
      song_id: songId,
      release_id: detail.song.release_id,
      items: mergedItems,
      ready_score: readyScore,
      status: body?.status ?? detail.checklist?.status ?? "in_progress",
      notes: body?.notes ?? detail.checklist?.notes ?? null,
      owner_user_id: body?.ownerUserId ?? detail.checklist?.owner_user_id ?? auth.ctx.user.id,
      due_date: body?.dueDate ?? detail.checklist?.due_date ?? null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = detail.checklist?.id
      ? await auth.service.from("launch_checklists").update(payload).eq("id", detail.checklist.id).select("*").single()
      : await auth.service.from("launch_checklists").insert(payload).select("*").single();

    if (error || !data) {
      return errorJson(error?.message ?? "Failed to save launch checklist.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: String(detail.song.artist_id),
      action: "update_launch_checklist",
      entityType: "launch_checklist",
      entityId: String(data.id),
      details: {
        songId,
        readyScore
      }
    }).catch(() => undefined);

    return NextResponse.json({ checklist: data, readyScore });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to save launch data.", 400);
  }
}
