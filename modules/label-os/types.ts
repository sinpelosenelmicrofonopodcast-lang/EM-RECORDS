export type LabelOsAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  titleEn: string;
  titleEs: string;
  detailEn: string;
  detailEs: string;
  actionHref?: string | null;
};

export type LabelOsCampaign = {
  id: string;
  title: string;
  artistName: string | null;
  objective: string;
  status: "draft" | "scheduled" | "active" | "boosting" | "paused" | "completed";
  automationEnabled: boolean;
  budgetCents: number;
  startAt: string | null;
  endAt: string | null;
};

export type LabelOsRoyaltyRow = {
  id: string;
  artistName: string | null;
  source: string;
  statementPeriod: string;
  netAmount: number;
  payoutAmount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "disputed";
};

export type LabelOsPlan = {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  billingInterval: string;
  amountCents: number;
  currency: string;
  planType: string;
  active: boolean;
};

export type LabelOsAuditCheck = {
  id: string;
  category: "database" | "integrations" | "security" | "automation" | "qa";
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
};

export type LabelOsManagerInsight = {
  artistId: string | null;
  artistName: string;
  type: "daily_plan" | "release_strategy" | "viral_opportunity" | "collaboration" | "recovery";
  headlineEn: string;
  headlineEs: string;
  detailEn: string;
  detailEs: string;
  priority: "high" | "medium" | "low";
  confidence: number;
};

export type LabelOsDashboard = {
  metrics: {
    artists: number;
    activeArtists: number;
    releases: number;
    songs: number;
    activeCampaigns: number;
    queuedPosts: number;
    monthlyRevenueCents: number;
    mrrCents: number;
    pendingRoyaltiesCents: number;
    avgEngagement: number;
  };
  alerts: LabelOsAlert[];
  campaigns: LabelOsCampaign[];
  royalties: LabelOsRoyaltyRow[];
  servicePlans: LabelOsPlan[];
  subscriptions: {
    active: number;
    trialing: number;
    pastDue: number;
  };
  managerInsights: LabelOsManagerInsight[];
  readiness: LabelOsAuditCheck[];
};
