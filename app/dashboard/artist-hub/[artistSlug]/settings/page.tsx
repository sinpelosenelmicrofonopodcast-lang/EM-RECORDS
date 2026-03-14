import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { setFeatureFlagHubAction, updateArtistProfileHubAction, updateBrandKitHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

const DEFAULT_FLAGS = [
  "catalog",
  "launch_center",
  "media_kit",
  "gallery",
  "documents",
  "bookings",
  "content",
  "pr_inbox",
  "sync_hub",
  "reports"
];

export default async function ArtistHubSettingsPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist, ctx } = await requireArtistPageAccess(artistSlug);

  const service = createServiceClient();
  const { data: flagsData } = await service
    .from("artist_hub_feature_flags")
    .select("key,enabled")
    .eq("artist_id", artist.id)
    .order("key", { ascending: true });

  const flagMap = new Map((flagsData ?? []).map((row: any) => [String(row.key), Boolean(row.enabled)]));

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="settings"
        eyebrow="Settings"
        title="Profile, Brand Kit & Feature Flags"
        description="Artists can update their public profile here. Brand identity and admin-only feature flags stay in the same module."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Public profile</p>
        <form action={updateArtistProfileHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <input name="name" required defaultValue={artist.name} placeholder="Artist name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="stageName" defaultValue={artist.stageName ?? ""} placeholder="Stage name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="tagline" required defaultValue={artist.tagline} placeholder="Tagline" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="primaryGenre" defaultValue={artist.primaryGenre ?? ""} placeholder="Primary genre" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="territory" defaultValue={artist.territory ?? ""} placeholder="Territory" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="bookingEmail" required defaultValue={artist.bookingEmail} placeholder="Booking email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="publicEmail" defaultValue={String(artist.contacts.publicEmail ?? "")} placeholder="Public/contact email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="managerName" defaultValue={String(artist.contacts.managerName ?? "")} placeholder="Manager name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="managerEmail" defaultValue={String(artist.contacts.managerEmail ?? "")} placeholder="Manager email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="phone" defaultValue={String(artist.contacts.phone ?? "")} placeholder="Phone" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="avatarUrl" required defaultValue={artist.avatarUrl} placeholder="Avatar URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="heroMediaUrl" required defaultValue={artist.heroMediaUrl} placeholder="Hero image/video URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="bio" rows={4} required defaultValue={artist.bio} placeholder="Main bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea name="bioShort" rows={3} defaultValue={artist.bioShort ?? ""} placeholder="Short bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="bioMed" rows={4} defaultValue={artist.bioMed ?? ""} placeholder="Medium bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="bioLong" rows={5} defaultValue={artist.bioLong ?? ""} placeholder="Long bio / press bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="instagramUrl" defaultValue={artist.instagramUrl ?? String(artist.socialLinks.instagram ?? "")} placeholder="Instagram URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="tiktokUrl" defaultValue={artist.tiktokUrl ?? String(artist.socialLinks.tiktok ?? "")} placeholder="TikTok URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="spotifyUrl" defaultValue={artist.spotifyUrl ?? String(artist.socialLinks.spotify ?? "")} placeholder="Spotify URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="appleMusicUrl" defaultValue={artist.appleMusicUrl ?? String(artist.socialLinks.appleMusic ?? "")} placeholder="Apple Music URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="youtubeUrl" defaultValue={artist.youtubeUrl ?? String(artist.socialLinks.youtube ?? "")} placeholder="YouTube URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="xUrl" defaultValue={artist.xUrl ?? String(artist.socialLinks.x ?? "")} placeholder="X URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="facebookUrl" defaultValue={artist.facebookUrl ?? String(artist.socialLinks.facebook ?? "")} placeholder="Facebook URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="websiteUrl" defaultValue={String(artist.socialLinks.website ?? "")} placeholder="Website URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
            Save Profile
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Brand kit</p>
        <form action={updateBrandKitHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <input name="primaryHex" defaultValue={String((artist.brandKit as any).primaryHex ?? "")} placeholder="Primary hex" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="secondaryHex" defaultValue={String((artist.brandKit as any).secondaryHex ?? "")} placeholder="Secondary hex" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="accentHex" defaultValue={String((artist.brandKit as any).accentHex ?? "")} placeholder="Accent hex" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="fontPrimary" defaultValue={String((artist.brandKit as any).fontPrimary ?? "")} placeholder="Primary font" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="fontSecondary" defaultValue={String((artist.brandKit as any).fontSecondary ?? "")} placeholder="Secondary font" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="voice" rows={3} defaultValue={String((artist.brandKit as any).voice ?? "")} placeholder="Voice / tone notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Save Brand Kit
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Feature flags</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {DEFAULT_FLAGS.map((key) => (
            <form key={key} action={setFeatureFlagHubAction} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3">
              <input type="hidden" name="artistId" value={artist.id} />
              <input type="hidden" name="key" value={key} />
              <p className="text-sm text-white/80">{key}</p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input type="checkbox" name="enabled" defaultChecked={flagMap.get(key) ?? true} disabled={!ctx.isAdmin} />
                  enabled
                </label>
                {ctx.isAdmin ? (
                  <button type="submit" className="rounded-md border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                    Save
                  </button>
                ) : null}
              </div>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
