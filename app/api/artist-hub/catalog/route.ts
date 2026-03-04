import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { getCatalogBundle, hasArtistAccess, resolveMaybeSignedUrl } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");

  if (!artistId) {
    return errorJson("artistId is required.");
  }

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const catalog = await getCatalogBundle(artistId);

    const assets = await Promise.all(
      catalog.assets.map(async (asset) => ({
        ...asset,
        resolvedUrl: (await resolveMaybeSignedUrl(asset.url)) ?? asset.url,
        resolvedThumbUrl: (await resolveMaybeSignedUrl(asset.thumbUrl)) ?? asset.thumbUrl
      }))
    );

    return NextResponse.json({
      releases: catalog.releases,
      songs: catalog.songs,
      registrations: catalog.registrations,
      checklists: catalog.checklists,
      assets
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load catalog.", 500);
  }
}
