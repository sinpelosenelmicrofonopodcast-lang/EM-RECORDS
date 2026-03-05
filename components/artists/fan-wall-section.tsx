"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FanWallEntry } from "@/lib/types";
import { submitFanWallEntryAction } from "@/lib/actions/site";

type Props = {
  artistSlug: string;
  entries: FanWallEntry[];
};

type FanWallActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const INITIAL_STATE: FanWallActionState = {
  status: "idle",
  message: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-gold rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold disabled:cursor-not-allowed disabled:opacity-50 md:col-span-3 md:justify-self-start"
    >
      {pending ? "Submitting..." : "Submit to Fan Wall"}
    </button>
  );
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

export function FanWallSection({ artistSlug, entries }: Props) {
  const [state, action] = useActionState<FanWallActionState, FormData>(
    submitFanWallEntryAction as (state: FanWallActionState, payload: FormData) => Promise<FanWallActionState>,
    INITIAL_STATE
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
      <p className="text-xs uppercase tracking-[0.22em] text-gold">Fan Wall</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-white/10 bg-black/45 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs uppercase tracking-[0.16em] text-white/75">
                {entry.fanName.slice(0, 1)}
              </span>
              <div>
                <p className="text-sm text-white/80">
                  {entry.fanName}
                  {entry.isVerified ? (
                    <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
                      Verified Fan
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-white/45">{formatDate(entry.createdAt)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-white/78">“{entry.message}”</p>
          </article>
        ))}
      </div>

      <form action={action} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-3">
        <input type="hidden" name="artistSlug" value={artistSlug} />
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <input name="fanName" required maxLength={80} placeholder="Your name" className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
        <input
          name="message"
          required
          maxLength={400}
          placeholder="Your message"
          className="focus-gold rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2"
        />
        <SubmitButton />
        <p className="text-xs text-white/55 md:col-span-3">Leave your message for the movement.</p>
        {state.status === "success" ? <p className="text-xs text-emerald-200 md:col-span-3">{state.message}</p> : null}
        {state.status === "error" ? <p className="text-xs text-rose-200 md:col-span-3">{state.message}</p> : null}
      </form>
    </section>
  );
}
