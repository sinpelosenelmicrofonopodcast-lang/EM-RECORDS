export type LaunchChecklistInput = {
  isrc?: string | null;
  iswc?: string | null;
  masterSplitsConfirmed?: boolean;
  publishingSplitsConfirmed?: boolean;
  coverArt?: boolean;
  releaseDate?: string | null;
  mediaKitReady?: boolean;
  smartlinkReady?: boolean;
  bmiStatus?: string | null;
  mlcStatus?: string | null;
  songtrustStatus?: string | null;
  soundexchangeStatus?: string | null;
  distrokidStatus?: string | null;
  contentIdStatus?: string | null;
};

const STATUS_COMPLETE = new Set(["submitted", "approved"]);

function completedRegistration(status: string | null | undefined): boolean {
  if (!status) return false;
  return STATUS_COMPLETE.has(status);
}

export function calculateReadyScore(input: LaunchChecklistInput): number {
  const checks: boolean[] = [
    Boolean(input.isrc),
    Boolean(input.iswc),
    Boolean(input.masterSplitsConfirmed),
    Boolean(input.publishingSplitsConfirmed),
    Boolean(input.coverArt),
    Boolean(input.releaseDate),
    Boolean(input.mediaKitReady),
    Boolean(input.smartlinkReady),
    completedRegistration(input.bmiStatus),
    completedRegistration(input.mlcStatus),
    completedRegistration(input.songtrustStatus),
    completedRegistration(input.soundexchangeStatus),
    completedRegistration(input.distrokidStatus),
    completedRegistration(input.contentIdStatus)
  ];

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function launchScoreBadge(score: number): "red" | "yellow" | "green" {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}
