import { ArtistHubNav } from "@/components/artist-hub/artist-nav";

export function ArtistHubModuleHeader({
  artistSlug,
  active,
  eyebrow,
  title,
  description
}: {
  artistSlug: string;
  active: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <>
      <ArtistHubNav artistSlug={artistSlug} active={active} />
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm text-white/70">{description}</p> : null}
      </section>
    </>
  );
}
