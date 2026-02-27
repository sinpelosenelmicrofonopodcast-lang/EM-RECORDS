import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description: "Terms of Service, Privacy Policy, Copyright and DMCA for EM Records LLC."
};

function LegalSection({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{content}</p>
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-6 py-20 md:px-10">
      <h1 className="font-display text-5xl text-white">Legal</h1>
      <p className="text-sm text-white/65">Official legal policies for EM Records LLC and PUBLISHING BY DGM MUSIC.</p>

      <LegalSection
        title="Terms of Service"
        content="By using this website, you agree to lawful use, non-infringing conduct and acceptance of terms related to ticket sales, digital products, and event access."
      />
      <LegalSection
        title="Privacy Policy"
        content="We collect limited contact and usage data to operate services, process demo submissions, event transactions and provide communication updates."
      />
      <LegalSection
        title="Copyright"
        content="All masters, compositions, visuals and brand materials are protected under international copyright law unless otherwise stated."
      />
      <LegalSection
        title="DMCA"
        content="For infringement notices, send a complete DMCA request to legal@emrecords.com with all required identification details and proof of ownership."
      />
    </div>
  );
}
