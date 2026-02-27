import type { Metadata } from "next";
import { submitDemoAction } from "@/lib/actions/site";
import { SectionTitle } from "@/components/shared/section-title";

export const metadata: Metadata = {
  title: "Join EM",
  description: "Submit your demo to EM Records A&R."
};

export default function JoinPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Join EM"
        title="Demo Submissions"
        description="Upload your track and enter the official review pipeline. Status can be tracked in admin as pending, approved or rejected."
      />

      <form action={submitDemoAction} className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
        <input
          name="artistName"
          required
          placeholder="Artist Name"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
        />
        <input
          name="trackTitle"
          required
          placeholder="Track Title"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
        />
        <input
          type="file"
          name="trackFile"
          required
          accept="audio/*"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black md:col-span-2"
        />
        <textarea
          name="message"
          rows={5}
          placeholder="Tell us your vision"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
        />
        <button
          type="submit"
          className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start"
        >
          Submit Demo
        </button>
      </form>
    </div>
  );
}
