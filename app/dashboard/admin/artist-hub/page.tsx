import { redirect } from "next/navigation";
import { HubShell } from "@/components/artist-hub/hub-shell";
import { assignArtistMemberAction, createHubArtistAction } from "@/lib/actions/artist-hub";
import { requireHubPageContext } from "@/lib/artist-hub/page";
import { listArtistsForContext } from "@/lib/artist-hub/service";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export default async function ArtistHubAdminPage({ searchParams }: Props) {
  const ctx = await requireHubPageContext();
  if (!ctx.isAdmin) {
    redirect("/dashboard/artist-hub");
  }

  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const service = createServiceClient();
  const [artists, profilesRes, membersRes, userRolesRes] = await Promise.all([
    listArtistsForContext(ctx),
    service.from("profiles").select("id,email,full_name").order("created_at", { ascending: false }).limit(200),
    service.from("artist_members").select("artist_id,user_id,role,created_at"),
    service.from("user_roles").select("user_id,role")
  ]);

  const profiles = profilesRes.data ?? [];
  const members = membersRes.data ?? [];
  const userRoles = userRolesRes.data ?? [];
  const userIdsWithArtistMembership = new Set(members.map((member: any) => String(member.user_id)));
  const userIdsWithGlobalRole = new Set(userRoles.map((row: any) => String(row.user_id)));
  const pendingProfiles = profiles.filter((profile: any) => {
    const userId = String(profile.id);
    return !userIdsWithArtistMembership.has(userId) && !userIdsWithGlobalRole.has(userId);
  });

  return (
    <HubShell>
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Admin Control</p>
        <h1 className="mt-2 font-display text-4xl text-white">Artist Hub Management</h1>
        <p className="mt-2 text-sm text-white/70">Create artists, assign users, and control role-based access for Artist Hub modules.</p>
        {flashStatus && flashMessage ? (
          <div
            className={[
              "mt-4 rounded-xl border px-4 py-3 text-sm",
              flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            ].join(" ")}
          >
            {flashMessage}
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Create artist</p>
        <form action={createHubArtistAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Legal name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="stageName" placeholder="Stage name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="slug" placeholder="Slug (optional)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="bookingEmail" placeholder="Booking email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="tagline" placeholder="Tagline" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea name="bio" rows={3} placeholder="Bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea name="bioShort" rows={2} placeholder="Bio short" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="bioMed" rows={2} placeholder="Bio medium" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="bioLong" rows={2} placeholder="Bio long" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="heroMediaUrl" placeholder="Hero media URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="avatarUrl" placeholder="Avatar URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />

          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
            Create artist
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Assign user to artist</p>
        <form action={assignArtistMemberAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="artistId" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2">
            <option value="">Select artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.stageName || artist.name}
              </option>
            ))}
          </select>
          <input name="email" required placeholder="user@email.com" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" list="hub-profile-emails" />
          <datalist id="hub-profile-emails">
            {profiles.map((profile: any) => (
              <option key={profile.id} value={profile.email ?? ""} />
            ))}
          </datalist>
          <select name="role" defaultValue="artist" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="artist">artist</option>
            <option value="manager">manager</option>
            <option value="booking">booking</option>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-4 md:justify-self-start">
            Assign role
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pending artist accounts</p>
        {pendingProfiles.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/65">No hay cuentas pendientes de aprobación.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingProfiles.map((profile: any) => (
                  <tr key={profile.id} className="border-b border-white/5">
                    <td className="px-3 py-2">{profile.email || profile.id}</td>
                    <td className="px-3 py-2">{profile.full_name || "—"}</td>
                    <td className="px-3 py-2 text-white/60">Usa “Assign user to artist” para aprobar.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Artist memberships</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any, index: number) => {
                const artistName = artists.find((artist) => artist.id === member.artist_id)?.stageName || artists.find((artist) => artist.id === member.artist_id)?.name;
                const user = profiles.find((profile: any) => profile.id === member.user_id);

                return (
                  <tr key={`${member.artist_id}-${member.user_id}-${index}`} className="border-b border-white/5">
                    <td className="px-3 py-2">{artistName || member.artist_id}</td>
                    <td className="px-3 py-2">{user?.email || member.user_id}</td>
                    <td className="px-3 py-2">{member.role}</td>
                    <td className="px-3 py-2">{new Date(member.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Role matrix</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">admin</th>
                <th className="px-3 py-2">manager</th>
                <th className="px-3 py-2">booking</th>
                <th className="px-3 py-2">artist</th>
                <th className="px-3 py-2">staff</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Catalog", "view/edit", "view/edit", "view/edit", "view/edit", "view/edit"],
                ["Launch checklist", "view/edit", "view/edit", "view/edit", "view/edit", "view/edit"],
                ["Media kit PDF", "generate/download", "generate/download", "download", "generate/download", "download"],
                ["Content approval", "approve", "approve", "approve", "submit", "submit"],
                ["PR pipeline", "manage", "manage", "manage", "view", "view"],
                ["Document ACL", "manage", "view", "view", "view", "view"],
                ["Reports", "generate/download", "generate/download", "download", "download", "download"],
                ["Feature flags", "manage", "view", "view", "view", "view"]
              ].map((row) => (
                <tr key={String(row[0])} className="border-b border-white/5">
                  {row.map((col) => (
                    <td key={String(col)} className="px-3 py-2">
                      {col}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </HubShell>
  );
}
