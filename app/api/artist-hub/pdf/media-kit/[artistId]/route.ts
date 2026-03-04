import { NextResponse } from "next/server";
import { buildMediaKitPdf } from "@/lib/artist-hub/pdf";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import {
  getArtistByIdForContext,
  getMediaKitByArtistId,
  hasArtistAccess,
  insertAuditLog,
  resolveMaybeSignedUrl,
  smartlinkUrl,
  toStorageUrl
} from "@/lib/artist-hub/service";

type Params = { params: Promise<{ artistId: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { artistId } = await params;

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const artist = await getArtistByIdForContext(auth.ctx, artistId);
    if (!artist) {
      return errorJson("Artist not found.", 404);
    }

    const [mediaKit, releasesRes, photosRes, docsRes] = await Promise.all([
      getMediaKitByArtistId(artistId),
      auth.service.from("releases").select("id,title,release_date,artist_name,smartlink_slug").eq("artist_id", artistId).order("release_date", { ascending: false }).limit(3),
      auth.service.from("media_assets").select("url,metadata").eq("artist_id", artistId).eq("type", "photo").order("created_at", { ascending: false }).limit(8),
      auth.service.from("documents").select("version").eq("artist_id", artistId).eq("type", "epk").is("deleted_at", null).order("version", { ascending: false }).limit(1)
    ]);

    const topReleases = releasesRes.data ?? [];
    const smartlinkSlug = topReleases.find((row: any) => row.smartlink_slug)?.smartlink_slug ?? null;
    const smartlink = smartlinkSlug ? smartlinkUrl(String(smartlinkSlug)) : null;

    const selectedPhotos = (photosRes.data ?? [])
      .filter((row: any) => row.metadata?.includeInPdf !== false)
      .slice(0, 6)
      .map((row: any) => String(row.url));

    const resolvedPhotos = (
      await Promise.all(selectedPhotos.map(async (url) => (await resolveMaybeSignedUrl(url, 60 * 30)) ?? null))
    ).filter(Boolean) as string[];

    const pdf = await buildMediaKitPdf({
      artistName: artist.name,
      stageName: artist.stageName,
      headline: mediaKit?.headline,
      oneLiner: mediaKit?.oneLiner,
      bioShort: artist.bioShort,
      bioMed: artist.bioMed,
      stats: mediaKit?.stats,
      links: artist.socialLinks,
      contacts: {
        ...(artist.contacts ?? {}),
        ...(mediaKit?.contacts ?? {})
      },
      featuredTracks: topReleases.map((release: any) => ({
        title: String(release.title),
        artist: release.artist_name ? String(release.artist_name) : artist.stageName ?? artist.name,
        date: release.release_date ? String(release.release_date) : null
      })),
      pressQuotes: mediaKit?.pressQuotes ?? [],
      highlights: mediaKit?.highlights ?? [],
      photoUrls: resolvedPhotos,
      smartlink
    });

    const currentVersion = Number(docsRes.data?.[0]?.version ?? 0);
    const version = currentVersion + 1;
    const filename = `${artist.slug}-media-kit-v${version}.pdf`;
    const path = `${artistId}/media-kit/${filename}`;

    const { error: uploadError } = await auth.service.storage.from("artist-hub-pdfs").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true
    });

    if (uploadError) {
      return errorJson(uploadError.message, 400);
    }

    const storageUrl = toStorageUrl("artist-hub-pdfs", path);

    const { data: documentRow, error: documentError } = await auth.service
      .from("documents")
      .insert({
        artist_id: artistId,
        type: "epk",
        url: storageUrl,
        version,
        status: "approved",
        visibility: {
          admin: true,
          manager: true,
          booking: true,
          artist: true,
          staff: true
        },
        created_by: auth.ctx.user.id
      })
      .select("id,version,url")
      .single();

    if (documentError || !documentRow) {
      return errorJson(documentError?.message ?? "Failed to register Media Kit PDF.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId,
      action: "generate_media_kit_pdf",
      entityType: "document",
      entityId: String(documentRow.id),
      details: {
        version,
        path
      }
    }).catch(() => undefined);

    const downloadUrl = await resolveMaybeSignedUrl(storageUrl, 60 * 60 * 12);

    return NextResponse.json({
      document: {
        id: documentRow.id,
        version: documentRow.version,
        url: documentRow.url,
        downloadUrl
      }
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to generate Media Kit PDF.", 500);
  }
}
