"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { submitBookingInquiryAction } from "@/lib/actions/site";

type Props = {
  artistSlug: string;
  artistName: string;
  bookingEmail: string;
};

type BookingActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const INITIAL_STATE: BookingActionState = {
  status: "idle",
  message: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-gold rounded-full border border-gold bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send inquiry"}
    </button>
  );
}

export function BookingInquiryModal({ artistSlug, artistName, bookingEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<BookingActionState, FormData>(
    submitBookingInquiryAction as (state: BookingActionState, payload: FormData) => Promise<BookingActionState>,
    INITIAL_STATE
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="focus-gold mt-4 inline-flex rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold">
        {`BOOK ${artistName.toUpperCase()}`}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/82 p-4" role="dialog" aria-modal="true" aria-label={`Book ${artistName}`}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#080808] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gold">Booking Inquiry</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Book {artistName}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="focus-gold rounded-full border border-white/20 p-1.5 text-white/75 hover:text-white" aria-label="Close booking form">
                <X size={15} />
              </button>
            </div>

            <form action={action} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="artistSlug" value={artistSlug} />
              <input type="hidden" name="artistName" value={artistName} />
              <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <select name="inquiryType" required className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
                <option value="festival">Festival</option>
                <option value="club">Club</option>
                <option value="private">Private</option>
                <option value="brand">Brand</option>
              </select>
              <input name="city" required placeholder="City" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <input name="dateRange" required placeholder="Date range" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <input name="budgetRange" required placeholder="Budget range" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <input name="contactEmail" required type="email" placeholder="Email" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <input name="contactPhone" placeholder="Phone" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <textarea name="message" rows={4} placeholder="Event details" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />

              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <SubmitButton />
                <a href={`mailto:${bookingEmail}`} className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-white/70">
                  Email direct
                </a>
              </div>
              {state.status === "success" ? <p className="text-xs text-emerald-200 md:col-span-2">{state.message}</p> : null}
              {state.status === "error" ? <p className="text-xs text-rose-200 md:col-span-2">{state.message}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
