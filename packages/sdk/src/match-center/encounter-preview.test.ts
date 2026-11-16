import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  assignCandidate,
  candidateKey,
  NO_ASSIGNMENTS,
  previewEncounter,
  selectionsFor,
} from "./encounter-preview.ts";

const club = (externalClubId: string) => ({
  platform: "common-gen5" as const,
  externalClubId,
  name: externalClubId,
});

const view = {
  home: { teamId: "t1", name: "Rayo", externalClub: club("c-rayo") },
  away: { teamId: "t2", name: "Norte", externalClub: club("c-norte") },
  resolutionMode: "aggregate_score",
  officialMatches: [
    { officialSlot: 1, scheduledStartAt: "2026-10-01T18:00:00.000Z" },
    { officialSlot: 2, scheduledStartAt: "2026-10-01T18:30:00.000Z" },
  ],
} as unknown as EncounterViewDto;

const candidate = (id: string, home: [string, number], away: [string, number]) =>
  ({
    reference: { providerKey: "ea-clubs", externalId: id },
    occurredAt: "2026-10-01T18:05:00.000Z",
    home: { externalClubId: home[0], name: home[0], goals: home[1], imageUrl: null },
    away: { externalClubId: away[0], name: away[0], goals: away[1], imageUrl: null },
  }) as unknown as EncounterCandidateDto;

const first = candidate("m-1", ["c-rayo", 2], ["c-norte", 1]);
/** Played with Norte as the EA home club: goals flip to the Encounter's sides. */
const second = candidate("m-2", ["c-norte", 3], ["c-rayo", 0]);

describe("encounter preview", () => {
  it("orients each slot to the Encounter's Teams and adds the aggregate", () => {
    let assignments = assignCandidate(NO_ASSIGNMENTS, 1, candidateKey(first));
    assignments = assignCandidate(assignments, 2, candidateKey(second));
    const preview = previewEncounter(view, [first, second], assignments);
    expect(preview.slots.map((slot) => (slot.kind === "scored" ? slot.score : null))).toEqual([
      { home: 2, away: 1 },
      { home: 0, away: 3 },
    ]);
    expect(preview.series).toEqual({
      kind: "aggregate",
      total: { home: 2, away: 4 },
      outcome: "away",
    });
    expect(selectionsFor(view, [first, second], assignments)).toEqual([
      { officialSlot: 1, providerMatchRef: first.reference },
      { officialSlot: 2, providerMatchRef: second.reference },
    ]);
  });

  it("sends nothing while a slot is empty and moves a candidate between slots", () => {
    const one = assignCandidate(NO_ASSIGNMENTS, 1, candidateKey(first));
    expect(selectionsFor(view, [first, second], one)).toBeNull();
    expect(previewEncounter(view, [first], one).series).toEqual({ kind: "incomplete" });
    expect(assignCandidate(one, 2, candidateKey(first))).toEqual({ 1: null, 2: "ea-clubs:m-1" });
    expect(assignCandidate(one, 1, candidateKey(first))).toEqual(NO_ASSIGNMENTS);
  });
});
