import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { upsertContractTemplateAction } from "@/lib/actions/signing";
import {
  OFFICIAL_RECORDING_AGREEMENT_BODY_MARKDOWN,
  OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA,
  OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME,
  OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_VERSION
} from "@/lib/signing/recording-agreement";
import { listContractTemplates } from "@/lib/signing/service";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSigningTemplatesPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";
  const templates = await listContractTemplates();

  return (
    <AdminSigningShell title="Templates" subtitle="Configurable contract templates with variable merge and clause toggles.">
      {flashStatus && flashMessage ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {decodeURIComponent(flashMessage)}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Create Template</h2>
        <p className="mt-2 text-sm text-white/65">
          The form below is preloaded with the official EM Records Artist Recording Agreement so admin can save it directly or tailor a variation.
        </p>
        <form action={upsertContractTemplateAction} className="mt-4 grid gap-3">
          <input type="hidden" name="redirectTo" value="/admin/signing/templates" />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="name"
              required
              defaultValue={OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME}
              placeholder="Template name"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
            />
            <input
              name="version_name"
              required
              defaultValue={OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_VERSION}
              placeholder="Version name (v1.0)"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
            />
          </div>
          <textarea
            name="body_markdown"
            required
            rows={14}
            placeholder="# Contract title&#10;&#10;Use variables like {{artist_legal_name}} and clauses [if:includes_360]...[/if:includes_360]"
            defaultValue={OFFICIAL_RECORDING_AGREEMENT_BODY_MARKDOWN}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 font-mono text-xs text-white"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                name="schema_includes_publishing"
                defaultChecked={OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA.includes_publishing}
                className="h-4 w-4 rounded border-white/40 bg-black text-gold"
              />
              Publishing toggle
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                name="schema_includes_360"
                defaultChecked={OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA.includes_360}
                className="h-4 w-4 rounded border-white/40 bg-black text-gold"
              />
              360 toggle
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                name="schema_perpetual_master_rights"
                defaultChecked={OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA.perpetual_master_rights}
                className="h-4 w-4 rounded border-white/40 bg-black text-gold"
              />
              Perpetual rights toggle
            </label>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:w-fit">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
            Active template
          </label>
          <button type="submit" className="w-fit rounded-full border border-gold bg-gold px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black">
            Save Template
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {templates.map((template) => (
          <article key={template.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-white">
                {template.name} <span className="text-white/60">({template.versionName})</span>
              </h3>
              <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${template.active ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/20 bg-white/5 text-white/65"}`}>
                {template.active ? "active" : "inactive"}
              </span>
            </div>
            <form action={upsertContractTemplateAction} className="mt-4 grid gap-3">
              <input type="hidden" name="redirectTo" value="/admin/signing/templates" />
              <input type="hidden" name="template_id" value={template.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <input name="name" defaultValue={template.name} required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
                <input name="version_name" defaultValue={template.versionName} required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              </div>
              <textarea name="body_markdown" rows={10} defaultValue={template.bodyMarkdown} className="rounded-xl border border-white/15 bg-black px-4 py-3 font-mono text-xs text-white" />
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
                  <input type="checkbox" name="schema_includes_publishing" defaultChecked={Boolean(template.clauseSchema.includes_publishing)} className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
                  Publishing toggle
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
                  <input type="checkbox" name="schema_includes_360" defaultChecked={Boolean(template.clauseSchema.includes_360)} className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
                  360 toggle
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
                  <input
                    type="checkbox"
                    name="schema_perpetual_master_rights"
                    defaultChecked={Boolean(template.clauseSchema.perpetual_master_rights)}
                    className="h-4 w-4 rounded border-white/40 bg-black text-gold"
                  />
                  Perpetual rights toggle
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:w-fit">
                <input type="checkbox" name="active" defaultChecked={template.active} className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
                Active template
              </label>
              <button type="submit" className="w-fit rounded-full border border-gold px-6 py-2.5 text-xs uppercase tracking-[0.16em] text-gold">
                Update Template
              </button>
            </form>
          </article>
        ))}
      </section>
    </AdminSigningShell>
  );
}
