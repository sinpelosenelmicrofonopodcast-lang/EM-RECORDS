import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import {
  duplicateSocialPost,
  publishSocialPostNow,
  repostSocialPost,
  saveSocialPostDraft,
  scheduleSocialPost
} from "@/modules/social-media/service";
import type { SocialMediaContentType, SocialMediaPlatform } from "@/modules/social-media/types";

const baseComposerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  contentId: z.string().uuid().optional().nullable(),
  contentType: z.enum(["song", "blog", "news", "video", "artist", "custom"]).default("custom"),
  title: z.string().trim().optional().nullable(),
  caption: z.string().trim().default(""),
  platforms: z.array(z.enum(["facebook", "instagram", "tiktok", "x", "youtube"])).default([]),
  mediaUrl: z.string().trim().optional().nullable(),
  link: z.string().trim().optional().nullable(),
  scheduledAt: z.string().trim().optional().nullable()
});

const mutateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("save_draft"),
    postId: z.never().optional()
  }).merge(baseComposerSchema),
  z.object({
    mode: z.literal("schedule"),
    postId: z.never().optional()
  }).merge(baseComposerSchema),
  z.object({
    mode: z.literal("post_now"),
    postId: z.never().optional()
  }).merge(baseComposerSchema),
  z.object({
    mode: z.literal("duplicate"),
    postId: z.string().uuid()
  }),
  z.object({
    mode: z.literal("repost"),
    postId: z.string().uuid()
  })
]);

export async function POST(request: Request) {
  const ctx = await requireGrowthApiContext("admin");
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  try {
    const payload = mutateSchema.parse(await request.json());

    if (payload.mode === "duplicate") {
      const post = await duplicateSocialPost(ctx.service, payload.postId);
      return NextResponse.json({ ok: true, post });
    }

    if (payload.mode === "repost") {
      const post = await repostSocialPost(ctx.service, payload.postId);
      return NextResponse.json({ ok: true, post });
    }

    const input = {
      id: payload.id ?? null,
      contentId: payload.contentId ?? null,
      contentType: payload.contentType as SocialMediaContentType,
      title: payload.title ?? null,
      caption: payload.caption,
      platforms: payload.platforms as SocialMediaPlatform[],
      mediaUrl: payload.mediaUrl ?? null,
      link: payload.link ?? null,
      scheduledAt: payload.scheduledAt ?? null
    };

    const post =
      payload.mode === "save_draft"
        ? await saveSocialPostDraft(ctx.service, input)
        : payload.mode === "schedule"
          ? await scheduleSocialPost(ctx.service, input)
          : await publishSocialPostNow(ctx.service, input);

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? "Failed to save post.") }, { status: 400 });
  }
}
