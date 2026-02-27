import { AdminShell } from "@/components/admin/admin-shell";
import { upsertNewsAction } from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getNewsAdmin } from "@/lib/queries";

export default async function AdminNewsPage() {
  await requireAdminPage();
  const news = await getNewsAdmin();

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">News / Press Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">News</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Create article</p>
        <form action={upsertNewsAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <input name="slug" required placeholder="Slug" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="category" required placeholder="Category" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="heroUrl" required placeholder="Hero image URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input type="date" name="publishedAt" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <select name="contentStatus" defaultValue="published" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="published">published</option>
            <option value="scheduled">scheduled</option>
            <option value="draft">draft</option>
          </select>
          <input type="datetime-local" name="publishAt" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <textarea name="excerpt" rows={3} required placeholder="Excerpt" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <textarea name="content" rows={6} required placeholder="Article content" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
            Publish Article
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Edit existing articles</p>
        <div className="mt-4 space-y-5">
          {news.map((item) => (
            <form key={item.id} action={upsertNewsAction} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-2">
              <input type="hidden" name="id" value={item.id} />
              <input name="title" required defaultValue={item.title} placeholder="Title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
              <input name="slug" required defaultValue={item.slug} placeholder="Slug" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input name="category" required defaultValue={item.category} placeholder="Category" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input name="heroUrl" required defaultValue={item.heroUrl} placeholder="Hero image URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input type="date" name="publishedAt" required defaultValue={String(item.publishedAt).slice(0, 10)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <select name="contentStatus" defaultValue={item.contentStatus ?? "published"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
                <option value="published">published</option>
                <option value="scheduled">scheduled</option>
                <option value="draft">draft</option>
              </select>
              <input type="datetime-local" name="publishAt" defaultValue={item.publishAt ? new Date(item.publishAt).toISOString().slice(0, 16) : ""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <textarea name="excerpt" rows={3} required defaultValue={item.excerpt} placeholder="Excerpt" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
              <textarea name="content" rows={6} required defaultValue={item.content} placeholder="Article content" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
              <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
                Update Article
              </button>
            </form>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
