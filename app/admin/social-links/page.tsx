import { AdminShell } from "@/components/admin/admin-shell";
import { deleteSocialLinkAction, upsertSocialLinkAction } from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getSocialLinksAdmin } from "@/lib/queries";

export default async function AdminSocialLinksPage() {
  await requireAdminPage();
  const links = await getSocialLinksAdmin();

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Footer Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">Social Links</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Create social link</p>
        <form action={upsertSocialLinkAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="label"
            required
            placeholder="Label (Instagram, YouTube, etc.)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            name="url"
            required
            placeholder="https://..."
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            type="number"
            name="sortOrder"
            min={0}
            defaultValue={links.length + 1}
            placeholder="Order"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
            Active in footer
          </label>

          <button
            type="submit"
            className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start"
          >
            Create Link
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Edit existing links</p>
        <div className="mt-4 space-y-4">
          {links.map((link) => (
            <div key={link.id} className="grid gap-3 rounded-xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gold">ID: {link.id}</p>

              <form action={upsertSocialLinkAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={link.id} />
                <input
                  name="label"
                  required
                  defaultValue={link.label}
                  placeholder="Label"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <input
                  name="url"
                  required
                  defaultValue={link.url}
                  placeholder="https://..."
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <input
                  type="number"
                  name="sortOrder"
                  min={0}
                  defaultValue={link.sortOrder}
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
                  <input type="checkbox" name="isActive" defaultChecked={link.isActive} className="h-4 w-4 rounded border-white/30 bg-black" />
                  Active in footer
                </label>

                <button
                  type="submit"
                  className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start"
                >
                  Update Link
                </button>
              </form>

              <form action={deleteSocialLinkAction}>
                <input type="hidden" name="id" value={link.id} />
                <button
                  type="submit"
                  className="rounded-full border border-red-500/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300 hover:border-red-400 hover:text-red-200"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
