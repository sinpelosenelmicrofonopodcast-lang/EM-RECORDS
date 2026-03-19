import { generateOpenAiJson } from "@/lib/ai/openai";

export type LabelManagerInsight = {
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

type ArtistInput = {
  id: string;
  name: string;
  stageName: string | null;
  active: boolean;
  releaseTitles: string[];
  topTracks: string[];
  engagementRate: number;
  lastContentAt: string | null;
};

type InsightEnvelope = {
  insights: LabelManagerInsight[];
};

function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
}

function buildFallbackInsights(artists: ArtistInput[]): LabelManagerInsight[] {
  const output: LabelManagerInsight[] = [];

  const inactiveArtist = artists.find((artist) => {
    const hours = hoursSince(artist.lastContentAt);
    return artist.active && (hours == null || hours > 24 * 21);
  });

  if (inactiveArtist) {
    output.push({
      artistId: inactiveArtist.id,
      artistName: inactiveArtist.stageName ?? inactiveArtist.name,
      type: "recovery",
      headlineEn: `${inactiveArtist.stageName ?? inactiveArtist.name} needs a re-engagement push`,
      headlineEs: `${inactiveArtist.stageName ?? inactiveArtist.name} necesita empuje de reactivacion`,
      detailEn: "Queue an artist story, one reel, and a collaboration teaser this week to restore momentum.",
      detailEs: "Programa una historia del artista, un reel y un teaser de colaboracion esta semana para recuperar momentum.",
      priority: "high",
      confidence: 0.82
    });
  }

  const breakoutArtist = artists
    .slice()
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .find((artist) => artist.engagementRate > 0);

  if (breakoutArtist) {
    output.push({
      artistId: breakoutArtist.id,
      artistName: breakoutArtist.stageName ?? breakoutArtist.name,
      type: "viral_opportunity",
      headlineEn: `Boost ${breakoutArtist.stageName ?? breakoutArtist.name} while engagement is hot`,
      headlineEs: `Impulsa ${breakoutArtist.stageName ?? breakoutArtist.name} mientras el engagement esta caliente`,
      detailEn: "Recycle the strongest hook into 3 short-form variants and move the campaign into boosting mode.",
      detailEs: "Recicla el hook mas fuerte en 3 variantes de short-form y mueve la campana a modo boosting.",
      priority: "high",
      confidence: 0.86
    });
  }

  if (artists.length >= 2) {
    const first = artists[0];
    const second = artists[1];
    output.push({
      artistId: null,
      artistName: `${first.stageName ?? first.name} x ${second.stageName ?? second.name}`,
      type: "collaboration",
      headlineEn: "Cross-pollinate audiences with a collaboration content test",
      headlineEs: "Cruza audiencias con una prueba de contenido colaborativo",
      detailEn: `Test a duet, co-sign reel, or behind-the-scenes crossover between ${first.stageName ?? first.name} and ${second.stageName ?? second.name}.`,
      detailEs: `Prueba un dueto, reel de co-sign o crossover behind-the-scenes entre ${first.stageName ?? first.name} y ${second.stageName ?? second.name}.`,
      priority: "medium",
      confidence: 0.71
    });
  }

  return output.slice(0, 6);
}

export async function generateLabelManagerInsights(artists: ArtistInput[]): Promise<LabelManagerInsight[]> {
  const fallback = { insights: buildFallbackInsights(artists) } satisfies InsightEnvelope;

  const prompt = [
    "You are an autonomous AI label manager for EM Records.",
    "Return JSON with an `insights` array only.",
    "Each insight must include: artistId, artistName, type, headlineEn, headlineEs, detailEn, detailEs, priority, confidence.",
    "Prioritize release strategy, viral opportunities, artist inactivity recovery, and collaborations.",
    "Keep the recommendations operator-ready and business-driven."
  ].join(" ");

  const artistSummary = artists.map((artist) => ({
    id: artist.id,
    name: artist.stageName ?? artist.name,
    active: artist.active,
    releaseTitles: artist.releaseTitles.slice(0, 4),
    topTracks: artist.topTracks.slice(0, 4),
    engagementRate: artist.engagementRate,
    lastContentAt: artist.lastContentAt
  }));

  const result = await generateOpenAiJson<InsightEnvelope>(
    [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify({ artists: artistSummary }) }
    ],
    fallback
  );

  const safeInsights = Array.isArray(result.data?.insights) ? result.data!.insights : fallback.insights;
  return safeInsights.slice(0, 6);
}
