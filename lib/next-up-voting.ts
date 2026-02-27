export const DEFAULT_NEXT_UP_VOTING_STARTS_AT = "2026-03-13T00:00:00-05:00";
export const DEFAULT_NEXT_UP_VOTING_ENDS_AT = "2026-04-03T23:59:59-05:00";

export type NextUpVotingPhase = "before" | "active" | "ended";

export function resolveNextUpVotingWindow(startsAt?: string | null, endsAt?: string | null): { startsAt: Date; endsAt: Date } {
  const startsAtDate = new Date(startsAt || DEFAULT_NEXT_UP_VOTING_STARTS_AT);
  const endsAtDate = new Date(endsAt || DEFAULT_NEXT_UP_VOTING_ENDS_AT);

  if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime()) || endsAtDate <= startsAtDate) {
    return {
      startsAt: new Date(DEFAULT_NEXT_UP_VOTING_STARTS_AT),
      endsAt: new Date(DEFAULT_NEXT_UP_VOTING_ENDS_AT)
    };
  }

  return {
    startsAt: startsAtDate,
    endsAt: endsAtDate
  };
}

export function getNextUpVotingPhase(now: Date, startsAt: Date, endsAt: Date): NextUpVotingPhase {
  if (now < startsAt) return "before";
  if (now > endsAt) return "ended";
  return "active";
}
