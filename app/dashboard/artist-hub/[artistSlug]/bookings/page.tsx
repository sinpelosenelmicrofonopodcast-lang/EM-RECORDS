import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { createBookingHubAction, updateBookingStatusHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getBookingsByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubBookingsPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist, role, ctx } = await requireArtistPageAccess(artistSlug);
  const bookings = await getBookingsByArtistId(artist.id);

  const canMoveStatus = ctx.isAdmin || role === "manager" || role === "booking";

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="bookings"
        eyebrow="Bookings"
        title="Booking Pipeline"
        description="Track inbound requests, negotiations, confirmations and routing notes per artist."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">New request</p>
        <form action={createBookingHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <input name="requesterName" placeholder="Requester name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="requesterEmail" placeholder="Requester email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="eventName" placeholder="Event name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="eventLocation" placeholder="Location" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="eventDate" placeholder="Event date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="budget" placeholder="Budget" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="notes" rows={3} placeholder="Notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Add Booking Request
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pipeline</p>
        <div className="mt-4 space-y-3">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">{booking.eventName || "Untitled booking"}</h3>
                  <p className="text-sm text-white/60">
                    {booking.requesterName || "Unknown requester"} · {booking.requesterEmail || "No email"}
                  </p>
                  <p className="text-sm text-white/55">
                    {booking.eventLocation || "No location"} · {booking.eventDate || "No date"} · {booking.budget ? `$${booking.budget}` : "No budget"}
                  </p>
                </div>

                {canMoveStatus ? (
                  <form action={updateBookingStatusHubAction} className="flex items-center gap-2">
                    <input type="hidden" name="artistId" value={artist.id} />
                    <input type="hidden" name="id" value={booking.id} />
                    <select name="status" defaultValue={booking.status} className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white">
                      <option value="new">new</option>
                      <option value="in_review">in_review</option>
                      <option value="negotiating">negotiating</option>
                      <option value="confirmed">confirmed</option>
                      <option value="done">done</option>
                      <option value="declined">declined</option>
                    </select>
                    <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75">
                      Update
                    </button>
                  </form>
                ) : (
                  <p className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/55">{booking.status}</p>
                )}
              </div>

              {booking.notes ? <p className="mt-3 text-sm text-white/70">{booking.notes}</p> : null}
            </article>
          ))}

          {bookings.length === 0 ? <p className="text-sm text-white/60">No booking requests yet.</p> : null}
        </div>
      </section>
    </>
  );
}
