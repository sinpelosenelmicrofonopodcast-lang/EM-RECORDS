import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { listAuditLogs } from "@/lib/signing/service";

export const dynamic = "force-dynamic";

export default async function AdminSigningAuditLogsPage() {
  const logs = await listAuditLogs(400);

  return (
    <AdminSigningShell title="Audit Logs" subtitle="Append-only operational log for contracts, signatures, invites, onboarding updates, and pipeline events.">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Lead / Contract</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 align-top">
                  <td className="px-3 py-3 text-xs text-white/60">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-white">{log.action.replaceAll("_", " ")}</td>
                  <td className="px-3 py-3 text-xs text-white/70">
                    {log.entityType} · {log.entityId}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/65">
                    <p>{log.artistLeadId || "N/A"}</p>
                    <p>{log.contractId || "N/A"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-white/55">
                    <pre className="max-w-[420px] overflow-x-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-2">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No audit logs yet.</p> : null}
        </div>
      </section>
    </AdminSigningShell>
  );
}

