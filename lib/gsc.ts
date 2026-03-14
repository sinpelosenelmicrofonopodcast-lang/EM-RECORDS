import { createSign } from "node:crypto";

type GscSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type GscPerformancePayload = {
  configured: boolean;
  summary: GscSummary;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  rangeDays: number;
  error?: string;
};

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getGscEnv() {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const siteUrl = process.env.GSC_SITE_URL;
  const sitemapUrl = process.env.GSC_SITEMAP_URL || `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://emrecordsmusic.com"}/sitemap.xml`;

  return {
    serviceEmail,
    privateKey,
    siteUrl,
    sitemapUrl
  };
}

function buildJwtAssertion(input: { serviceEmail: string; privateKey: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: input.serviceEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(input.privateKey);

  return `${unsigned}.${base64UrlEncode(signature)}`;
}

async function getGoogleAccessToken(): Promise<string | null> {
  const { serviceEmail, privateKey } = getGscEnv();
  if (!serviceEmail || !privateKey) return null;

  const assertion = buildJwtAssertion({
    serviceEmail,
    privateKey
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function submitGscSitemap(): Promise<{ configured: boolean; ok: boolean; error?: string }> {
  const { siteUrl, sitemapUrl } = getGscEnv();
  if (!siteUrl || !sitemapUrl) {
    return { configured: false, ok: false, error: "Missing GSC_SITE_URL or GSC_SITEMAP_URL" };
  }

  const token = await getGoogleAccessToken();
  if (!token) {
    return { configured: false, ok: false, error: "Missing or invalid Google service account credentials." };
  }

  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "GSC sitemap submit failed.");
    return { configured: true, ok: false, error: errorText.slice(0, 500) };
  }

  return { configured: true, ok: true };
}

function toDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchGscPerformance(rangeDays = 28): Promise<GscPerformancePayload> {
  const { siteUrl } = getGscEnv();
  if (!siteUrl) {
    return {
      configured: false,
      rangeDays,
      summary: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
      topPages: [],
      error: "Missing GSC_SITE_URL"
    };
  }

  const token = await getGoogleAccessToken();
  if (!token) {
    return {
      configured: false,
      rangeDays,
      summary: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
      topPages: [],
      error: "Missing or invalid Google service account credentials."
    };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - Math.max(rangeDays - 1, 0));
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const summaryResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      startDate: toDateISO(startDate),
      endDate: toDateISO(endDate),
      rowLimit: 1
    })
  });

  const summary: GscSummary = {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0
  };

  if (summaryResponse.ok) {
    const payload = (await summaryResponse.json()) as { rows?: GscRow[] };
    const row = payload.rows?.[0];
    if (row) {
      summary.clicks = Number(row.clicks ?? 0);
      summary.impressions = Number(row.impressions ?? 0);
      summary.ctr = Number(row.ctr ?? 0);
      summary.position = Number(row.position ?? 0);
    }
  }

  async function queryDimension(dimension: "query" | "page") {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startDate: toDateISO(startDate),
        endDate: toDateISO(endDate),
        dimensions: [dimension],
        rowLimit: 15
      })
    });

    if (!response.ok) {
      return [] as GscRow[];
    }

    const payload = (await response.json()) as { rows?: GscRow[] };
    return payload.rows ?? [];
  }

  const [queryRows, pageRows] = await Promise.all([queryDimension("query"), queryDimension("page")]);

  return {
    configured: true,
    summary,
    topQueries: queryRows.map((row) => ({
      query: String(row.keys?.[0] ?? ""),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0)
    })),
    topPages: pageRows.map((row) => ({
      page: String(row.keys?.[0] ?? ""),
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0)
    })),
    rangeDays
  };
}

