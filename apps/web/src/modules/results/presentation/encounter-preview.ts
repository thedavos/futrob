import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";

export type OfficialSlot = 1 | 2;

/** Local, unsaved choice of one EA candidate key per official slot. */
export type SlotAssignments = { readonly 1: string | null; readonly 2: string | null };

export const NO_ASSIGNMENTS: SlotAssignments = { 1: null, 2: null };

/** Goals oriented to the Encounter's Teams, not to the EA home/away of the candidate. */
export type TeamScore = { readonly home: number; readonly away: number };

export type ScoreOutcome = "home" | "draw" | "away";

export type SlotPreview =
  | { readonly slot: OfficialSlot; readonly kind: "unassigned" }
  | {
      readonly slot: OfficialSlot;
      readonly kind: "unmatched";
      readonly candidate: EncounterCandidateDto;
    }
  | {
      readonly slot: OfficialSlot;
      readonly kind: "scored";
      readonly candidate: EncounterCandidateDto;
      readonly score: TeamScore;
      readonly outcome: ScoreOutcome;
    };

export type SeriesPreview =
  | { readonly kind: "incomplete" }
  | { readonly kind: "single"; readonly score: TeamScore; readonly outcome: ScoreOutcome }
  | { readonly kind: "aggregate"; readonly total: TeamScore; readonly outcome: ScoreOutcome }
  | { readonly kind: "independent" }
  | { readonly kind: "mode_unknown" };

export type EncounterPreview = {
  readonly slots: readonly SlotPreview[];
  readonly series: SeriesPreview;
};

export function candidateKey(candidate: EncounterCandidateDto): string {
  return `${candidate.reference.providerKey}:${candidate.reference.externalId}`;
}

/** Puts `key` in `slot`, taking it out of any other slot; choosing it again clears the slot. */
export function assignCandidate(
  assignments: SlotAssignments,
  slot: OfficialSlot,
  key: string,
): SlotAssignments {
  if (assignments[slot] === key) return clearSlot(assignments, slot);
  const vacated = {
    1: assignments[1] === key ? null : assignments[1],
    2: assignments[2] === key ? null : assignments[2],
  };
  return slot === 1 ? { ...vacated, 1: key } : { ...vacated, 2: key };
}

export function clearSlot(assignments: SlotAssignments, slot: OfficialSlot): SlotAssignments {
  return slot === 1 ? { ...assignments, 1: null } : { ...assignments, 2: null };
}

export function slotOf(assignments: SlotAssignments, key: string): OfficialSlot | null {
  if (assignments[1] === key) return 1;
  if (assignments[2] === key) return 2;
  return null;
}

export function previewEncounter(
  view: Pick<EncounterViewDto, "home" | "away" | "officialMatches" | "resolutionMode">,
  candidates: readonly EncounterCandidateDto[],
  assignments: SlotAssignments,
): EncounterPreview {
  const byKey = new Map(candidates.map((candidate) => [candidateKey(candidate), candidate]));
  const slots = view.officialMatches.map(({ officialSlot }): SlotPreview => {
    const key = assignments[officialSlot];
    const candidate = key === null ? undefined : byKey.get(key);
    if (!candidate) return { slot: officialSlot, kind: "unassigned" };
    const score = orient(view, candidate);
    if (!score) return { slot: officialSlot, kind: "unmatched", candidate };
    return { slot: officialSlot, kind: "scored", candidate, score, outcome: outcomeOf(score) };
  });
  return { slots, series: seriesOf(view.resolutionMode, slots) };
}

function seriesOf(
  mode: EncounterViewDto["resolutionMode"],
  slots: readonly SlotPreview[],
): SeriesPreview {
  const scores = slots.flatMap((slot) => (slot.kind === "scored" ? [slot.score] : []));
  if (scores.length !== slots.length) return { kind: "incomplete" };
  const [only] = scores;
  if (scores.length === 1 && only) return { kind: "single", score: only, outcome: outcomeOf(only) };
  switch (mode) {
    case "aggregate_score": {
      const total = scores.reduce(
        (sum, score) => ({ home: sum.home + score.home, away: sum.away + score.away }),
        { home: 0, away: 0 },
      );
      return { kind: "aggregate", total, outcome: outcomeOf(total) };
    }
    case "independent_matches":
      return { kind: "independent" };
    case null:
      return { kind: "mode_unknown" };
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

function orient(
  view: Pick<EncounterViewDto, "home" | "away">,
  candidate: EncounterCandidateDto,
): TeamScore | null {
  const homeClub = view.home.externalClub?.externalClubId;
  const awayClub = view.away.externalClub?.externalClubId;
  const asPlayed = { home: candidate.home.goals, away: candidate.away.goals };
  const reversed = { home: candidate.away.goals, away: candidate.home.goals };
  if (homeClub === candidate.home.externalClubId || awayClub === candidate.away.externalClubId) {
    return asPlayed;
  }
  if (homeClub === candidate.away.externalClubId || awayClub === candidate.home.externalClubId) {
    return reversed;
  }
  return null;
}

function outcomeOf(score: TeamScore): ScoreOutcome {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}
