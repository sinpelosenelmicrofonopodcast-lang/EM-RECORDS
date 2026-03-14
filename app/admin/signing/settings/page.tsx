import { AdminSigningShell } from "@/components/signing/admin-signing-shell";

export const dynamic = "force-dynamic";

export default async function AdminSigningSettingsPage() {
  const envRows = [
    ["EM_RECORDS_LEGAL_ENTITY", process.env.EM_RECORDS_LEGAL_ENTITY || "EM Records LLC (default)"],
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000 (recommended in production)"],
    ["SIGNING_EMAIL_FROM", process.env.SIGNING_EMAIL_FROM || "not configured"],
    ["RESEND_API_KEY", process.env.RESEND_API_KEY ? "configured" : "not configured"],
    ["SIGNING_EMAIL_WEBHOOK_URL", process.env.SIGNING_EMAIL_WEBHOOK_URL ? "configured" : "not configured"],
    ["SIGNING_LABEL_SIGNER_EMAIL", process.env.SIGNING_LABEL_SIGNER_EMAIL || "legal@emrecordsmusic.com (fallback)"]
  ];

  return (
    <AdminSigningShell title="Settings" subtitle="Operational settings and deployment checklist for the signing system.">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Environment Snapshot</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Variable</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {envRows.map(([key, value]) => (
                <tr key={key} className="border-b border-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-white/80">{key}</td>
                  <td className="px-3 py-2 text-sm text-white/70">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Storage Buckets</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>`signing-contracts` for draft and executed PDFs</li>
            <li>`signing-documents` for artist uploads</li>
            <li>`signing-signatures` for captured signature images</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Operational Notes</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>Executed contracts are DB-locked and cannot be modified.</li>
            <li>Invite links are hashed, expirable and revocable.</li>
            <li>Use audit logs for legal and internal workflow traceability.</li>
            <li>Email flows fall back to in-app notifications if no provider is configured.</li>
          </ul>
        </article>
      </section>
    </AdminSigningShell>
  );
}

