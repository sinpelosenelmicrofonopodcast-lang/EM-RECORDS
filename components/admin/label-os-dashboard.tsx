"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { SiteLanguage } from "@/lib/i18n";
import type { LabelOsDashboard } from "@/modules/label-os/types";

type Props = {
  initialData: LabelOsDashboard;
  lang: SiteLanguage;
};

type Banner = {
  tone: "success" | "error";
  message: string;
} | null;

function currency(valueCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(valueCents / 100);
}

function statusClass(status: "pass" | "warning" | "fail") {
  if (status === "pass") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "warning") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-red-400/30 bg-red-400/10 text-red-100";
}

async function parseJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String((payload as { error?: string } | null)?.error ?? "Request failed."));
  }
  return payload;
}

export function LabelOsDashboardClient({ initialData, lang }: Props) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("release_growth");
  const [royaltySource, setRoyaltySource] = useState("manual");
  const [royaltyNet, setRoyaltyNet] = useState("0");
  const [royaltyPeriod, setRoyaltyPeriod] = useState(new Date().toISOString().slice(0, 10));

  const copy = {
    es: {
      hero: "Label OS",
      title: "Centro operativo autonomo",
      description:
        "Administra artistas, catalogo, campaigns, royalties, subscriptions y readiness desde una sola capa premium conectada al motor de growth.",
      runCycle: "Run Label Cycle",
      createCampaign: "Crear campana",
      recordRoyalty: "Registrar regalia",
      alerts: "Alertas",
      readiness: "Deployment Readiness",
      campaigns: "Campanas activas",
      royalties: "Royalty ledger",
      plans: "Monetizacion",
      manager: "AI Label Manager"
    },
    en: {
      hero: "Label OS",
      title: "Autonomous operating center",
      description:
        "Manage artists, catalog, campaigns, royalties, subscriptions, and deployment readiness from a single premium control layer tied to the growth engine.",
      runCycle: "Run Label Cycle",
      createCampaign: "Create Campaign",
      recordRoyalty: "Record Royalty",
      alerts: "Alerts",
      readiness: "Deployment Readiness",
      campaigns: "Active Campaigns",
      royalties: "Royalty Ledger",
      plans: "Monetization",
      manager: "AI Label Manager"
    }
  }[lang];

  async function runCycle() {
    setBusy(true);
    try {
      const payload = await parseJson(await fetch("/api/admin/label-os", { method: "POST" }));
      setBanner({
        tone: "success",
        message:
          lang === "es"
            ? `Ciclo ejecutado. Campanas creadas: ${payload.result?.createdCampaigns ?? 0}, boosts: ${payload.result?.boostedCampaigns ?? 0}.`
            : `Cycle executed. Campaigns created: ${payload.result?.createdCampaigns ?? 0}, boosts: ${payload.result?.boostedCampaigns ?? 0}.`
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "Cycle failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign() {
    setBusy(true);
    try {
      await parseJson(
        await fetch("/api/admin/label-os/campaigns", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: campaignTitle || (lang === "es" ? "Campana manual" : "Manual campaign"),
            objective: campaignObjective,
            status: "draft",
            automationEnabled: true
          })
        })
      );
      setBanner({ tone: "success", message: lang === "es" ? "Campana guardada." : "Campaign saved." });
      setCampaignTitle("");
      startTransition(() => router.refresh());
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "Campaign failed.") });
    } finally {
      setBusy(false);
    }
  }

  async function createRoyalty() {
    setBusy(true);
    try {
      const netAmount = Number(royaltyNet);
      await parseJson(
        await fetch("/api/admin/label-os/royalties", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source: royaltySource,
            statementPeriod: royaltyPeriod,
            grossAmount: netAmount,
            netAmount,
            sharePct: 100,
            payoutAmount: netAmount,
            status: "pending"
          })
        })
      );
      setBanner({ tone: "success", message: lang === "es" ? "Regalia registrada." : "Royalty recorded." });
      setRoyaltyNet("0");
      startTransition(() => router.refresh());
    } catch (error) {
      setBanner({ tone: "error", message: String((error as Error).message ?? "Royalty failed.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner ? (
        <div className={`rounded-2xl border p-4 text-sm ${banner.tone === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
          {banner.message}
        </div>
      ) : null}

      <section className="premium-surface overflow-hidden rounded-[32px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{copy.hero}</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-white/68 md:text-base">{copy.description}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runCycle()}
            className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
          >
            {copy.runCycle}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            ["Artists", initialData.metrics.activeArtists, `${initialData.metrics.artists} total`],
            ["Catalog", initialData.metrics.songs, `${initialData.metrics.releases} releases`],
            ["Campaigns", initialData.metrics.activeCampaigns, `${initialData.metrics.queuedPosts} queued`],
            ["Revenue", currency(initialData.metrics.monthlyRevenueCents), `MRR ${currency(initialData.metrics.mrrCents)}`],
            ["Royalties", currency(initialData.metrics.pendingRoyaltiesCents), `${(initialData.metrics.avgEngagement * 100).toFixed(1)}% engagement`]
          ].map(([label, value, detail], index) => (
            <motion.article
              key={String(label)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="metric-card rounded-[24px] p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{label}</p>
              <p className="mt-2 font-display text-3xl text-white">{value}</p>
              <p className="mt-2 text-xs text-white/45">{detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.alerts}</p>
                <h2 className="mt-2 font-display text-2xl text-white">Ops Signals</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {initialData.alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{lang === "es" ? alert.titleEs : alert.titleEn}</p>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${alert.severity === "critical" ? "border-red-400/30 bg-red-400/10 text-red-100" : alert.severity === "warning" ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-sky-400/30 bg-sky-400/10 text-sky-100"}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/65">{lang === "es" ? alert.detailEs : alert.detailEn}</p>
                </div>
              ))}
              {initialData.alerts.length === 0 ? <p className="text-sm text-white/55">No active alerts.</p> : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.manager}</p>
            <div className="mt-5 grid gap-3">
              {initialData.managerInsights.map((insight) => (
                <motion.article
                  key={`${insight.artistName}-${insight.type}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{lang === "es" ? insight.headlineEs : insight.headlineEn}</p>
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-gold">
                      {insight.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/65">{lang === "es" ? insight.detailEs : insight.detailEn}</p>
                  <p className="mt-2 text-xs text-white/40">{insight.artistName} • {(insight.confidence * 100).toFixed(0)}%</p>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.campaigns}</p>
            <div className="mt-4 space-y-3">
              {initialData.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{campaign.title}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-gold">{campaign.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {campaign.artistName ?? "EM Records"} • {currency(campaign.budgetCents)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.readiness}</p>
            <div className="mt-4 space-y-3">
              {initialData.readiness.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{item.label}</p>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/60">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.plans}</p>
            <div className="mt-4 space-y-3">
              {initialData.servicePlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-white/10 px-4 py-3">
                  <p className="text-sm text-white">{lang === "es" ? plan.nameEs : plan.nameEn}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                    {plan.planType} • {plan.billingInterval} • {currency(plan.amountCents)}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm text-white/70">
                Active {initialData.subscriptions.active} • Trialing {initialData.subscriptions.trialing} • Past due {initialData.subscriptions.pastDue}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.createCampaign}</p>
            <div className="mt-4 grid gap-3">
              <input value={campaignTitle} onChange={(event) => setCampaignTitle(event.target.value)} placeholder={lang === "es" ? "Titulo de campana" : "Campaign title"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input value={campaignObjective} onChange={(event) => setCampaignObjective(event.target.value)} placeholder="Objective" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <button type="button" disabled={busy} onClick={() => void createCampaign()} className="rounded-full border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.18em] text-white/80 disabled:opacity-60">
                {copy.createCampaign}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.recordRoyalty}</p>
            <div className="mt-4 grid gap-3">
              <input value={royaltySource} onChange={(event) => setRoyaltySource(event.target.value)} placeholder="spotify / bmi / mlc / manual" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input type="date" value={royaltyPeriod} onChange={(event) => setRoyaltyPeriod(event.target.value)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <input value={royaltyNet} onChange={(event) => setRoyaltyNet(event.target.value)} placeholder="Net amount" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
              <button type="button" disabled={busy} onClick={() => void createRoyalty()} className="rounded-full border border-white/20 px-5 py-3 text-xs uppercase tracking-[0.18em] text-white/80 disabled:opacity-60">
                {copy.recordRoyalty}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{copy.royalties}</p>
            <div className="mt-4 space-y-3">
              {initialData.royalties.map((royalty) => (
                <div key={royalty.id} className="rounded-2xl border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{royalty.artistName ?? "EM Records"} • {royalty.source}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-gold">{royalty.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {royalty.statementPeriod} • {currency(Math.round(royalty.payoutAmount * 100))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
