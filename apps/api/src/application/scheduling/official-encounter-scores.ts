import type { OfficialResult, OfficialResultSlotSnapshot } from "@futrob/results";
import type { EncounterId, TeamId } from "@futrob/shared-kernel";
import type { PairedEncounter } from "./paired-encounters.ts";

export interface OrientedEncounterScore {
  readonly homeGoals: number;
  readonly awayGoals: number;
}

export type OfficialResultScoreSource = Pick<
  OfficialResult,
  "encounterId" | "revision" | "status" | "slots"
>;

/**
 * Reduces a single approved OfficialResult to goals per slot oriented to the Encounter's
 * home/away Teams using the Teams frozen on each slot at approval. Current
 * ExternalClubConnections are never consulted: a re-link must not reinterpret an approved
 * result. Returns null when the result is missing, not approved, or has an unattributable slot.
 */
export function officialEncounterScore(
  encounter: { readonly homeTeamId: TeamId; readonly awayTeamId: TeamId },
  result: OfficialResultScoreSource | null,
): readonly OrientedEncounterScore[] | null {
  if (!result || result.status !== "approved" || result.slots.length === 0) return null;
  const oriented = [...result.slots]
    .sort((a, b) => a.officialSlot - b.officialSlot)
    .map((slot) => orientSlot(slot, encounter.homeTeamId, encounter.awayTeamId));
  if (
    oriented.length >= 1 &&
    oriented.length <= 2 &&
    oriented.every((score): score is OrientedEncounterScore => score !== null)
  ) {
    return oriented;
  }
  return null;
}

/**
 * Latest approved revision of each played Encounter's OfficialResult, reduced to goals per slot
 * and oriented to the Encounter. A slot keeps EA's home/away sides, which may be the reverse of
 * the fixture, so each slot is flipped when the Teams frozen on it at approval face the
 * Encounter the other way round. Current ExternalClubConnections are never consulted: a re-link
 * must not reinterpret an approved result. A result with a slot that cannot be attributed to the
 * Encounter's Teams publishes no score rather than guessing the provider's order.
 */
export function officialEncounterScores(
  paired: readonly PairedEncounter[],
  results: readonly OfficialResultScoreSource[],
): ReadonlyMap<EncounterId, readonly OrientedEncounterScore[]> {
  const latest = new Map<EncounterId, OfficialResultScoreSource>();
  for (const result of results) {
    if (result.status !== "approved") continue;
    const current = latest.get(result.encounterId);
    if (current && current.revision > result.revision) continue;
    latest.set(result.encounterId, result);
  }
  const scores = new Map<EncounterId, readonly OrientedEncounterScore[]>();
  for (const { encounter, homeTeamId, awayTeamId } of paired) {
    const oriented = officialEncounterScore(
      { homeTeamId, awayTeamId },
      latest.get(encounter.id) ?? null,
    );
    if (oriented) scores.set(encounter.id, oriented);
  }
  return scores;
}

function orientSlot(
  slot: OfficialResultSlotSnapshot,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
): OrientedEncounterScore | null {
  if (slot.homeTeamId === homeTeamId || slot.awayTeamId === awayTeamId) {
    return { homeGoals: slot.homeGoals, awayGoals: slot.awayGoals };
  }
  if (slot.homeTeamId === awayTeamId || slot.awayTeamId === homeTeamId) {
    return { homeGoals: slot.awayGoals, awayGoals: slot.homeGoals };
  }
  return null;
}
