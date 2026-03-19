import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { generateAiSocialPost } from "@/modules/social-media/service";
import type { SocialMediaContentType } from "@/modules/social-media/types";

const requestSchema = z.object({
  contentId: z.string().uuid().nullable().optional(),
  contentType: z.enum(["song", "blog", "news", "video", "artist", "custom"]),
  title: z.string().trim().min(1),
  publicLink: z.string().trim().optional().nullable(),
  artistName: z.string().trim().optional().nullable(),
  excerpt: z.string().trim().optional().nullable(),
  mediaUrl: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  const ctx = await requireGrowthApiContext("admin");
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  try {
    const payload = requestSchema.parse(await request.json());
    const post = await generateAiSocialPost({
      contentId: payload.contentId ?? null,
      contentType: payload.contentType as SocialMediaContentType,
      title: payload.title,
      publicLink: payload.publicLink ?? null,
      artistName: payload.artistName ?? null,
      excerpt: payload.excerpt ?? null,
      mediaUrl: payload.mediaUrl ?? null
    });

    return NextResponse.json({
      ok: true,
      post: {
        ...post,
        title: payload.title
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? "Failed to generate post.") }, { status: 400 });
  }
}
