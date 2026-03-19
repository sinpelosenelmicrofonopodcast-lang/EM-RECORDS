import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl } from "@/lib/utils";
import { getPublicBlogPostBySlug } from "@/modules/social-media/service";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Blog | EM Records",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: `${post.title} | EM Records`,
    description: post.excerpt ?? undefined,
    alternates: {
      canonical: absoluteUrl(`/blog/${slug}`)
    }
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10">
      <div className="premium-surface rounded-[32px] p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Blog</p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">{post.title}</h1>
        {post.heroUrl ? <img src={post.heroUrl} alt={post.title} className="mt-6 w-full rounded-[24px] border border-white/10 object-cover" /> : null}
        {post.excerpt ? <p className="mt-6 text-lg leading-relaxed text-white/72">{post.excerpt}</p> : null}
        <div className="mt-6 whitespace-pre-wrap text-sm leading-8 text-white/78">{post.content || post.excerpt}</div>
      </div>
    </article>
  );
}
