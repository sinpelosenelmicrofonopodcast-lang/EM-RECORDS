import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FinalCountdown } from "@/components/killeen/final-countdown";
import { VotingWindowCountdown } from "@/components/killeen/voting-window-countdown";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { castNextUpVoteAction, submitNextUpDemoAction } from "@/lib/actions/site";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getNextUpVotingPhase, resolveNextUpVotingWindow } from "@/lib/next-up-voting";
import { getNextUpCompetitors, getNextUpLeaderboard, getNextUpSettings } from "@/lib/queries";
import { normalizeImageUrl, normalizeSoundCloudEmbedUrl, normalizeYouTubeEmbedUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Killeen Next Up",
  description: "KILLEEN NEXT UP powered by EM Records: submit your demo, vote and follow the competition."
};

type Props = {
  searchParams: Promise<{ demo?: string; vote?: string }>;
};

function InfoMessage({ type, value, lang }: { type: "demo" | "vote"; value?: string; lang: "es" | "en" }) {
  if (!value) return null;

  const messages: Record<string, string> =
    lang === "es"
      ? {
          ok: type === "demo" ? "Demo enviada correctamente. Revisa tu email de confirmación." : "Voto registrado exitosamente.",
          sent: "Código OTP enviado por email.",
          duplicate_stage: "Ese nombre artístico ya envió una demo.",
          closed: "La votación está cerrada temporalmente.",
          invalid: "Completa correctamente todos los campos.",
          no_otp: "Primero solicita el código OTP.",
          invalid_otp: "Código OTP incorrecto.",
          expired: "El código OTP expiró. Solicita uno nuevo.",
          duplicate: "Ya votaste por este artista.",
          captcha: "Verificación anti-bot requerida.",
          error: "Ocurrió un error. Intenta nuevamente.",
          config: "Configuración incompleta del sistema."
        }
      : {
          ok: type === "demo" ? "Demo submitted successfully. Check your confirmation email." : "Vote registered successfully.",
          sent: "OTP code sent by email.",
          duplicate_stage: "That stage name already submitted a demo.",
          closed: "Voting is currently closed.",
          invalid: "Complete all fields correctly.",
          no_otp: "Request your OTP code first.",
          invalid_otp: "Incorrect OTP code.",
          expired: "OTP code expired. Request a new one.",
          duplicate: "You already voted for this artist.",
          captcha: "Anti-bot verification required.",
          error: "An error occurred. Please try again.",
          config: "System configuration is incomplete."
        };

  const isPositive = value === "ok" || value === "sent";

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-xs uppercase tracking-[0.16em] ${
        isPositive ? "border-green-400/35 bg-green-500/10 text-green-300" : "border-red-400/35 bg-red-500/10 text-red-300"
      }`}
    >
      {messages[value] ?? (lang === "es" ? "Operación procesada." : "Operation processed.")}
    </p>
  );
}

function CompetitorDemo({ demoUrl, stageName }: { demoUrl: string; stageName: string }) {
  const lower = demoUrl.toLowerCase();
  if (lower.includes("soundcloud.com") || lower.includes("w.soundcloud.com")) {
    return <iframe src={normalizeSoundCloudEmbedUrl(demoUrl)} width="100%" height="180" allow="autoplay" className="rounded-xl border border-white/15" />;
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return (
      <iframe
        src={normalizeYouTubeEmbedUrl(demoUrl)}
        width="100%"
        height="180"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        className="rounded-xl border border-white/15"
      />
    );
  }
  return <audio controls src={demoUrl} className="w-full rounded-xl border border-white/15" title={`${stageName} demo`} />;
}

export default async function KilleenNextUpPage({ searchParams }: Props) {
  const lang = await getSiteLanguage();
  const [competitors, leaderboard, settings, qs] = await Promise.all([
    getNextUpCompetitors(),
    getNextUpLeaderboard(),
    getNextUpSettings(),
    searchParams
  ]);
  const totalVotes = competitors.reduce((acc, competitor) => acc + competitor.votesCount, 0);
  const votingEnabled = Boolean(settings.votingEnabled);
  const { startsAt: votingStartsAt, endsAt: votingEndsAt } = resolveNextUpVotingWindow(settings.votingStartsAt, settings.votingEndsAt);
  const votingPhase = getNextUpVotingPhase(new Date(), votingStartsAt, votingEndsAt);
  const canVoteNow = votingEnabled && votingPhase === "active";

  return (
    <div className="bg-gradient-to-b from-[#070707] via-[#0b0b0f] to-black">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(229,57,53,0.22),transparent_38%),radial-gradient(circle_at_80%_4%,rgba(198,168,91,0.22),transparent_33%)]" />
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
          <p className="animate-fade-up text-xs uppercase tracking-[0.3em] text-gold">Powered by EM Records</p>
          <h1 className="animate-fade-up mt-4 font-display text-6xl leading-[0.95] text-white md:text-8xl">KILLEEN NEXT UP</h1>
          <p className="animate-fade-up mt-6 max-w-3xl text-base leading-relaxed text-white/78 md:text-lg">
            {lang === "es"
              ? "EM Records regalará una producción profesional completa a un artista local."
              : "EM Records will gift a full professional production to one local artist."}
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3">
            <a href="#submit-demo" className="rounded-full border border-red-400 bg-red-500 px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              {lang === "es" ? "Envía tu demo" : "Submit your demo"}
            </a>
            <a href="#competencia" className="rounded-full border border-gold/60 px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {lang === "es" ? "Ver artistas en competencia" : "View competing artists"}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pt-12 md:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-gold/35 bg-black shadow-2xl shadow-black/50">
          <div className="relative aspect-[16/10] md:aspect-[16/7]">
            <img src="/images/killeen-next-up-banner.png" alt="Convocatoria Killeen Next Up" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Qué se gana" : "What you win"}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(lang === "es"
            ? [
                {
                  title: "Producción Profesional",
                  items: ["Grabación en estudio", "Mezcla y master profesional", "Dirección artística"]
                },
                {
                  title: "Sesión de Fotos Profesional",
                  items: ["Shooting conceptual", "Fotos promocionales", "Branding visual"]
                },
                {
                  title: "Video Musical Cinematográfico",
                  items: ["Producción completa", "Dirección creativa", "Edición y color grading profesional"]
                }
              ]
            : [
                {
                  title: "Professional Production",
                  items: ["Studio recording", "Professional mix & master", "Artistic direction"]
                },
                {
                  title: "Professional Photoshoot",
                  items: ["Concept shoot", "Promo photos", "Visual branding"]
                },
                {
                  title: "Cinematic Music Video",
                  items: ["Full production", "Creative direction", "Professional edit and color grading"]
                }
              ]
          ).map((card, index) => (
            <article key={card.title} className="animate-fade-up rounded-3xl border border-white/12 bg-white/[0.03] p-6" style={{ animationDelay: `${index * 110}ms` }}>
              <h2 className="font-display text-2xl text-white">{card.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                {card.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="submit-demo" className="border-y border-white/10 bg-[#080808]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-10">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Envía tu demo" : "Submit your demo"}</p>
            <h2 className="font-display text-5xl text-white">{lang === "es" ? "Aplica ahora" : "Apply now"}</h2>
            <p className="text-sm text-white/70">
              {lang === "es"
                ? "Sube tu perfil, comparte tu demo y entra al sistema oficial de revisión de EM Records."
                : "Upload your profile, share your demo and enter EM Records official review system."}
            </p>
            <InfoMessage type="demo" value={qs.demo} lang={lang} />
          </div>

          <form action={submitNextUpDemoAction} className="grid gap-3 rounded-3xl border border-white/12 bg-white/[0.02] p-6 md:grid-cols-2">
            <input name="stageName" required placeholder="Nombre artístico" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="legalName" required placeholder="Nombre legal" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input type="email" name="email" required placeholder="Email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="phone" required placeholder="Teléfono" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="city" required placeholder="Ciudad" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="demoUrl" placeholder="Link demo (YouTube / SoundCloud)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <div className="md:col-span-2 rounded-xl border border-white/15 bg-black px-4 py-3">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/55">{lang === "es" ? "o sube archivo MP3" : "or upload MP3 file"}</p>
              <input
                type="file"
                name="demoFile"
                accept=".mp3,.wav,.m4a,audio/*"
                className="w-full text-sm text-white/80 file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black"
              />
            </div>
            <input name="socialLinks" placeholder="Redes sociales" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <textarea name="artistBio" rows={4} placeholder="Breve descripción del artista" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />
            <label className="md:col-span-2 flex items-start gap-2 text-sm text-white/75">
              <input type="checkbox" name="acceptTerms" required className="mt-1 h-4 w-4 rounded border-white/30 bg-black" />
              {lang === "es" ? "Acepto las reglas y términos de la competencia" : "I accept the contest rules and terms"}
            </label>
            <FormSubmitButton
              idleText={lang === "es" ? "Enviar demo" : "Submit demo"}
              pendingText={lang === "es" ? "Enviando demo..." : "Submitting demo..."}
              className="md:col-span-2 rounded-full border border-red-400 bg-red-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        </div>
      </section>

      <section id="rules" className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Reglas oficiales" : "Official rules"}</p>
        <div className="mt-6 rounded-3xl border border-white/12 bg-white/[0.02] p-6">
          <ul className="space-y-2 text-sm text-white/78">
            {lang === "es" ? (
              <>
                <li>• Debes residir en Killeen o área cercana.</li>
                <li>• Solo se acepta material original.</li>
                <li>• El artista conserva sus derechos.</li>
                <li>• EM Records se reserva el derecho de selección final.</li>
                <li>• La votación pública influye, pero no garantiza ganar.</li>
                <li>• No se permiten bots ni manipulación de votos.</li>
                <li>• Si se detecta fraude, el artista será descalificado.</li>
              </>
            ) : (
              <>
                <li>• You must live in Killeen or nearby area.</li>
                <li>• Only original material is accepted.</li>
                <li>• The artist keeps their rights.</li>
                <li>• EM Records reserves final selection rights.</li>
                <li>• Public voting influences but does not guarantee a win.</li>
                <li>• Bots and vote manipulation are not allowed.</li>
                <li>• Fraud detection leads to disqualification.</li>
              </>
            )}
          </ul>
          <Link href="/legal" className="mt-6 inline-block rounded-full border border-gold/50 px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold">
            {lang === "es" ? "Ver términos completos" : "View full terms"}
          </Link>
        </div>
      </section>

      <section id="competencia" className="border-y border-white/10 bg-[#060606]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Artistas en competencia" : "Artists in competition"}</p>
              <h2 className="mt-3 font-display text-4xl text-white">{lang === "es" ? "Vota. Ranking. Descubre." : "Vote. Rank. Discover."}</h2>
              <InfoMessage type="vote" value={qs.vote} lang={lang} />
              <VotingWindowCountdown startsAtIso={votingStartsAt.toISOString()} endsAtIso={votingEndsAt.toISOString()} lang={lang} />
              {!votingEnabled ? (
                <div className="mt-3 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs uppercase tracking-[0.14em] text-white/70">
                  {lang === "es" ? "Votación desactivada por el admin." : "Voting disabled by admin."}
                </div>
              ) : null}
              {votingEnabled && votingPhase !== "active" ? (
                <div className="mt-3 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs uppercase tracking-[0.14em] text-white/70">
                  {votingPhase === "before"
                    ? lang === "es"
                      ? "La votación aún no inicia."
                      : "Voting has not started yet."
                    : lang === "es"
                      ? "La votación ya cerró."
                      : "Voting is closed."}
                </div>
              ) : null}
            </div>
            <article className="rounded-2xl border border-gold/25 bg-gold/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">{lang === "es" ? "Contador de votos en vivo" : "Live Vote Counter"}</p>
              <p className="mt-3 font-display text-5xl text-white">{totalVotes}</p>
              <p className="mt-2 text-sm text-white/70">{lang === "es" ? "votos registrados en tiempo real" : "votes registered in real time"}</p>
            </article>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((competitor, index) => (
              <article key={competitor.id} className="animate-fade-up rounded-3xl border border-white/12 bg-white/[0.03] p-5" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl border border-white/10">
                  {competitor.photoUrl ? (
                    <Image src={normalizeImageUrl(competitor.photoUrl)} alt={competitor.stageName} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(198,168,91,0.18),transparent_42%),#0a0a0d]">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{lang === "es" ? "Foto pendiente" : "Photo pending"}</p>
                    </div>
                  )}
                </div>
                <p className="font-display text-2xl text-white">{competitor.stageName}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-white/50">{competitor.city}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gold">
                  {competitor.votesCount} {lang === "es" ? "votos" : "votes"}
                </p>

                <div className="mt-4">
                  <CompetitorDemo demoUrl={competitor.demoUrl} stageName={competitor.stageName} />
                </div>

                {canVoteNow ? (
                  <form action={castNextUpVoteAction} className="mt-4 space-y-2">
                    <input type="hidden" name="competitorId" value={competitor.id} />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder={lang === "es" ? "Tu email para votar" : "Your email to vote"}
                      className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                    />
                    <input name="website" tabIndex={-1} autoComplete="off" className="hidden" />
                    <FormSubmitButton
                      idleText={lang === "es" ? "Votar" : "Vote"}
                      pendingText={lang === "es" ? "Enviando voto..." : "Submitting vote..."}
                      className="w-full rounded-full border border-red-400 bg-red-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </form>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-xs uppercase tracking-[0.14em] text-white/65">
                    {lang === "es" ? "Votación no disponible en este momento." : "Voting is not available right now."}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-white/12 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">{lang === "es" ? "Top 5 artistas" : "Top 5 artists"}</p>
            <div className="mt-4 grid gap-2">
              {leaderboard.slice(0, 5).map((entry) => (
                <div key={entry.competitorId} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/85">
                  #{entry.rank} · {entry.stageName} · {entry.city} · {entry.votesCount} {lang === "es" ? "votos" : "votes"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        {settings.liveFinalAt ? <FinalCountdown targetDate={settings.liveFinalAt} lang={lang} /> : null}
        <div className="mt-10 rounded-3xl border border-white/12 bg-gradient-to-r from-black to-[#0f0a05] p-8 text-center">
          <p className="font-display text-4xl text-white">
            {lang === "es" ? "Killeen tiene talento. Ahora es momento de demostrarlo." : "Killeen has talent. Now it's time to prove it."}
          </p>
          <a
            href="https://instagram.com/emrecordsllc"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full border border-gold bg-gold px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
          >
            {lang === "es" ? "Síguenos en Instagram" : "Follow us on Instagram"}
          </a>
        </div>
      </section>
    </div>
  );
}
