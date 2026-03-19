"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useState } from "react";
import type { ContentHubItem, SocialMediaDashboardData, SocialMediaPlatform, SocialPostRecord } from "@/modules/social-media/types";

type Props = {
  initialData: SocialMediaDashboardData;
};

type Banner = {
  tone: "success" | "error";
  message: string;
} | null;

const platformLabels: Record<SocialMediaPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube"
};

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String((payload as { error?: string } | null)?.error ?? "Request failed."));
  }
  return payload;
}

function attachContentLink(caption: string, link: string) {
  const trimmedCaption = caption.trim();
  const trimmedLink = link.trim();
  if (!trimmedLink) return trimmedCaption;
  if (trimmedCaption.includes(trimmedLink)) return trimmedCaption;
  return [trimmedCaption, trimmedLink].filter(Boolean).join("\n\n").trim();
}

function pillClass(active: boolean) {
  return active
    ? "border-gold/45 bg-gold/12 text-gold"
    : "border-white/10 bg-black/25 text-white/65 hover:border-white/20 hover:text-white";
}

function getPostLogMessage(post?: Pick<SocialPostRecord, "publishLog"> | null) {
  if (!post) return null;

  for (const entry of post.publishLog) {
    const error = typeof entry.error === "string" ? entry.error.trim() : "";
    if (error) return error;
  }

  return null;
}

function formatPersistSuccessMessage(mode: "save_draft" | "schedule" | "post_now", post?: SocialPostRecord | null) {
  if (mode === "schedule") return "Post programado correctamente.";
  if (mode === "save_draft") return "Draft guardado.";

  const status = String(post?.status ?? "published");
  const reason = getPostLogMessage(post);

  if (status === "failed" && reason) {
    return `Post falló: ${reason}`;
  }

  if (status === "ready_for_manual" && reason) {
    return `Post listo para manual: ${reason}`;
  }

  return `Post procesado con estado ${status}.`;
}

function formatManagerSuccessMessage(mode: "duplicate" | "repost", post?: SocialPostRecord | null) {
  if (mode === "duplicate") return "Post duplicado como draft.";
  return formatPersistSuccessMessage("post_now", post);
}

export function SocialMediaControlCenter({ initialData }: Props) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ContentHubItem["type"]>("all");
  const [postPlatformFilter, setPostPlatformFilter] = useState<"all" | SocialMediaPlatform>("all");
  const [postTypeFilter, setPostTypeFilter] = useState<"all" | SocialPostRecord["contentType"]>("all");
  const [postStatusFilter, setPostStatusFilter] = useState<"all" | SocialPostRecord["status"]>("all");
  const [postDateFilter, setPostDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(initialData.contentHub[0]?.id ?? null);
  const [title, setTitle] = useState(initialData.contentHub[0]?.title ?? "");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState(initialData.contentHub[0]?.mediaUrl ?? "");
  const [link, setLink] = useState(initialData.contentHub[0]?.publicLink ?? "");
  const [platforms, setPlatforms] = useState<SocialMediaPlatform[]>(["facebook", "instagram"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const visibleContent = initialData.contentHub.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    const haystack = [item.title, item.artistName, item.subtitle, item.excerpt].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(deferredSearch.trim().toLowerCase());
  });

  const filteredPosts = initialData.posts.filter((post) => {
    if (postPlatformFilter !== "all" && !post.platforms.includes(postPlatformFilter)) return false;
    if (postTypeFilter !== "all" && post.contentType !== postTypeFilter) return false;
    if (postStatusFilter !== "all" && post.status !== postStatusFilter) return false;
    if (postDateFilter !== "all") {
      const cutoffDays = postDateFilter === "7d" ? 7 : postDateFilter === "30d" ? 30 : 90;
      const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
      if (new Date(post.createdAt).getTime() < cutoff) return false;
    }
    return true;
  });

  const selectedContent = initialData.contentHub.find((item) => item.id === selectedContentId) ?? null;

  function loadContent(item: ContentHubItem) {
    setEditingPostId(null);
    setSelectedContentId(item.id);
    setTitle(item.title);
    setMediaUrl(item.mediaUrl ?? "");
    setLink(item.publicLink);
    setCaption((current) => {
      if (!current.trim()) return item.publicLink;
      return current;
    });
  }

  function loadPost(post: SocialPostRecord) {
    setEditingPostId(post.id);
    setSelectedContentId(post.contentId ? `${post.contentType}:${post.contentId}` : null);
    setTitle(post.title ?? "");
    setCaption(post.caption);
    setMediaUrl(post.mediaUrl ?? "");
    setLink(post.link ?? "");
    setPlatforms(post.platforms);
    setScheduledAt(post.scheduledAt ? post.scheduledAt.slice(0, 16) : "");
    setBanner(null);
  }

  function togglePlatform(platform: SocialMediaPlatform) {
    setPlatforms((current) => (current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]));
  }

  function applyRecommendedHour(hour: number) {
    const next = new Date();
    next.setHours(hour, 0, 0, 0);
    if (next.getTime() < Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    const local = new Date(next.getTime() - next.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setScheduledAt(local);
  }

  async function generateWithAi() {
    const activeContent = selectedContent;
    if (!activeContent) {
      setBanner({ tone: "error", message: "Selecciona contenido del hub primero." });
      return;
    }

    setIsWorking(true);
    try {
      const payload = await parseJson(
        await fetch("/api/dashboard/social-media/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contentId: activeContent.contentId,
            contentType: activeContent.type,
            title: activeContent.title,
            publicLink: activeContent.publicLink,
            artistName: activeContent.artistName,
            excerpt: activeContent.excerpt,
            mediaUrl: activeContent.mediaUrl
          })
        })
      );

      setTitle(String(payload.post?.title ?? activeContent.title));
      setMediaUrl(String(payload.post?.mediaUrl ?? activeContent.mediaUrl ?? ""));
      setLink(String(payload.post?.link ?? activeContent.publicLink));
      setCaption(String(payload.post?.caption ?? activeContent.publicLink));
      setBanner({ tone: "success", message: "Caption generado y listo para editar." });
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "No se pudo generar el post.") });
    } finally {
      setIsWorking(false);
    }
  }

  async function persistPost(mode: "save_draft" | "schedule" | "post_now") {
    const contentType = selectedContent?.type ?? "custom";
    const contentId = selectedContent?.contentId ?? null;
    const finalCaption = attachContentLink(caption, link);

    setIsWorking(true);
    try {
      const payload = await parseJson(
        await fetch("/api/dashboard/social-media/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode,
            id: editingPostId,
            contentId,
            contentType,
            title,
            caption: finalCaption,
            platforms,
            mediaUrl,
            link,
            scheduledAt: scheduledAt || null
          })
        })
      );

      setBanner({
        tone: "success",
        message: formatPersistSuccessMessage(mode, payload.post ?? null)
      });
      setEditingPostId(String(payload.post?.id ?? editingPostId ?? ""));
      startTransition(() => router.refresh());
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "No se pudo guardar el post.") });
    } finally {
      setIsWorking(false);
    }
  }

  async function runManagerAction(mode: "duplicate" | "repost", postId: string) {
    setIsWorking(true);
    try {
      const payload = await parseJson(
        await fetch("/api/dashboard/social-media/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode, postId })
        })
      );

      setBanner({
        tone: "success",
        message: formatManagerSuccessMessage(mode, payload.post ?? null)
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "No se pudo ejecutar la acción.") });
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            banner.tone === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-red-400/30 bg-red-400/10 text-red-100"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-6">
        {[
          ["Content Hub", initialData.summary.contentItems],
          ["Drafts", initialData.summary.drafts],
          ["Scheduled", initialData.summary.scheduled],
          ["Published", initialData.summary.published],
          ["Manual", initialData.summary.readyForManual],
          ["Failed", initialData.summary.failed]
        ].map(([label, value]) => (
          <article key={String(label)} className="metric-card rounded-[24px] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="premium-surface rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">1. Content Hub</p>
            <h2 className="mt-2 font-display text-3xl text-white">Fuente unificada de contenido</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/65">
              Arrastra cualquier pieza al builder o selecciónala para inyectar link público, media y contexto automáticamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "song", "blog", "news", "video", "artist"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(typeFilter === value)}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/30 p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search songs, news, artists or videos"
            className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleContent.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
              onClick={() => loadContent(item)}
              className={`premium-card overflow-hidden rounded-[24px] p-4 text-left ${selectedContentId === item.id ? "border-gold/45 bg-gold/10" : ""}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] border border-white/10 bg-black/30">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full place-items-center text-[11px] uppercase tracking-[0.18em] text-white/35">No thumbnail</div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold">{item.type}</span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                    item.status === "published"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-white/55">{item.artistName ?? item.subtitle ?? "EM Records"}</p>
              {item.excerpt ? <p className="mt-3 text-sm leading-relaxed text-white/68">{item.excerpt}</p> : null}
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Public link</p>
                <p className="mt-2 truncate text-sm text-gold">{item.publicLink}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section
            className="premium-surface rounded-[28px] p-5 md:p-6"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const droppedId = event.dataTransfer.getData("text/plain");
              const item = initialData.contentHub.find((entry) => entry.id === droppedId);
              if (item) loadContent(item);
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">2. Post Builder</p>
                <h2 className="mt-2 font-display text-3xl text-white">Caption, media y plataformas</h2>
                <p className="mt-3 text-sm text-white/65">
                  Builder estilo control center: puedes partir de contenido existente o editar un draft para publicar de inmediato.
                </p>
              </div>
              <button
                type="button"
                onClick={generateWithAi}
                disabled={isWorking}
                className="rounded-full border border-gold bg-gold px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
              >
                Generate Post with AI
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[24px] border border-dashed border-gold/35 bg-gold/5 px-4 py-3 text-sm text-white/65">
                Suelta una card aquí para cargar automáticamente el contenido en el builder.
              </div>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Post title"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
              />

              <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Platforms</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["facebook", "instagram", "tiktok", "x", "youtube"] as SocialMediaPlatform[]).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(platforms.includes(platform))}`}
                    >
                      {platformLabels[platform]}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={8}
                placeholder="Caption editable estilo marca"
                className="rounded-[24px] border border-white/10 bg-black px-4 py-4 text-sm leading-relaxed text-white outline-none transition focus:border-gold"
              />

              <input
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="Media URL"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
              />
            </div>
          </section>

          <section className="premium-surface rounded-[28px] p-5 md:p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">3. Auto Link System</p>
            <h2 className="mt-2 font-display text-3xl text-white">Link automático siempre visible</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Resolved public link</p>
                <a href={link || "#"} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-gold">
                  {link || "Select content to generate a public link"}
                </a>
                <p className="mt-3 text-sm text-white/55">
                  El backend vuelve a insertar este link al guardar o publicar, aunque el caption se edite manualmente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCaption((current) => attachContentLink(current, link))}
                className="rounded-full border border-white/20 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white/75 transition hover:border-gold hover:text-gold"
              >
                Insert Link
              </button>
            </div>
          </section>

          <section className="premium-surface rounded-[28px] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold">4. Publish Engine</p>
                <h2 className="mt-2 font-display text-3xl text-white">Draft, schedule o publish now</h2>
                <p className="mt-3 text-sm text-white/65">
                  Facebook e Instagram publican con page token. TikTok, X y YouTube quedan listos para operación manual cuando no hay API activa.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/55">
                Meta ready:
                <span className="ml-2 text-white">
                  {initialData.envStatus.facebookConfigured ? "Facebook" : "Facebook off"} /{" "}
                  {initialData.envStatus.instagramConfigured ? "Instagram" : "Instagram off"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-white/45">Schedule</label>
                <input
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  type="datetime-local"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {initialData.bestPostingWindows.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => applyRecommendedHour(hour)}
                      className="rounded-full border border-white/12 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 transition hover:border-gold hover:text-gold"
                    >
                      AI {hour}:00
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void persistPost("post_now")}
                  className="rounded-full border border-gold bg-gold px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
                >
                  Post Now
                </button>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void persistPost("schedule")}
                  className="rounded-full border border-white/20 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 disabled:opacity-60"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void persistPost("save_draft")}
                  className="rounded-full border border-white/20 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 disabled:opacity-60"
                >
                  Save Draft
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="premium-surface rounded-[28px] p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Preview</p>
          <h2 className="mt-2 font-display text-3xl text-white">Real-time post preview</h2>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#090909]">
            <div className="relative aspect-square border-b border-white/10 bg-black">
              {mediaUrl ? (
                <img src={mediaUrl} alt={title || "Post media"} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-[11px] uppercase tracking-[0.18em] text-white/35">No media selected</div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">EM Records</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">{platforms.map((item) => platformLabels[item]).join(" / ") || "No platforms"}</p>
                </div>
                {selectedContent ? (
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold">{selectedContent.type}</span>
                ) : null}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{attachContentLink(caption, link) || "Write or generate a caption to preview it here."}</p>

              {link ? (
                <Link href={link} target="_blank" className="mt-4 block rounded-[20px] border border-white/10 bg-black/35 p-4 transition hover:border-gold/35">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Link preview</p>
                  <p className="mt-2 text-sm text-gold">{title || selectedContent?.title || "Content link"}</p>
                  <p className="mt-1 truncate text-xs text-white/45">{link}</p>
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </section>

      <section className="premium-surface rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">5. Posts Manager</p>
            <h2 className="mt-2 font-display text-3xl text-white">Scheduled, published y failed</h2>
            <p className="mt-3 text-sm text-white/65">Edita drafts existentes, duplícalos para nuevas variaciones o relánzalos como repost en un clic.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "facebook", "instagram", "tiktok", "x", "youtube"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPostPlatformFilter(value)}
                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(postPlatformFilter === value)}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "song", "blog", "news", "video", "artist", "custom"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPostTypeFilter(value)}
              className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(postTypeFilter === value)}`}
            >
              {value}
            </button>
          ))}
          {(["all", "7d", "30d", "90d"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPostDateFilter(value)}
              className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(postDateFilter === value)}`}
            >
              {value}
            </button>
          ))}
          {(["all", "draft", "scheduled", "published", "ready_for_manual", "failed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPostStatusFilter(value)}
              className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition ${pillClass(postStatusFilter === value)}`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {filteredPosts.map((post) => (
            <article key={post.id} className="premium-card rounded-[24px] p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gold">{post.contentType}</span>
                    <span className="rounded-full border border-white/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">{post.status}</span>
                    <span className="rounded-full border border-white/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">{post.platforms.join(", ")}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{post.title ?? "Untitled post"}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">{post.caption}</p>
                  {getPostLogMessage(post) ? (
                    <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                      {getPostLogMessage(post)}
                    </p>
                  ) : null}
                  {post.link ? (
                    <a href={post.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-gold">
                      {post.link}
                    </a>
                  ) : null}
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/40">
                    Created {new Date(post.createdAt).toLocaleString()} {post.scheduledAt ? `• Scheduled ${new Date(post.scheduledAt).toLocaleString()}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadPost(post)}
                    className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 transition hover:border-gold hover:text-gold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void runManagerAction("duplicate", post.id)}
                    className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 transition hover:border-gold hover:text-gold"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => void runManagerAction("repost", post.id)}
                    className="rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-gold transition hover:border-gold"
                  >
                    Repost
                  </button>
                </div>
              </div>
            </article>
          ))}

          {filteredPosts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-black/30 px-5 py-8 text-sm text-white/60">
              No posts match the current filters yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
