import { describe, expect, it } from "vite-plus/test";
import { officialSelectionActionSchema, proposeOfficialSelectionRequestSchema } from "./schemas.ts";

const action = {
  id: "action-1",
  proposalId: "proposal-1",
  type: "dispute_opened",
  fromStatus: "awaiting_opponent_confirmation",
  toStatus: "disputed",
  versionBefore: 1,
  versionAfter: 2,
  actorId: "actor-away",
  teamId: "team-away",
  capacity: "team",
  reason: "Marcador incorrecto; llamar [REDACTED]",
  officialResultId: null,
  details: { disputeId: "dispute-1" },
  occurredAt: "2026-09-14T21:00:00.000Z",
} as const;

describe("official selection wire contract", () => {
  it("drops command keys and request fingerprints from an audit entry", () => {
    expect(
      officialSelectionActionSchema.parse({
        ...action,
        commandKey: "away-dispute",
        requestFingerprint:
          "sha256:d59eee5f1c24c0332378b789b7f525d1eab5618089d6613ce8aa72248df9665d",
      }),
    ).toEqual(action);
  });

  it("takes the actor from authentication, not from the command body", () => {
    expect(
      proposeOfficialSelectionRequestSchema.parse({
        actingTeamId: "team-home",
        actorId: "actor-forged",
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
        ],
        expectedVersion: 0,
        commandKey: "  home-propose  ",
      }),
    ).toEqual({
      actingTeamId: "team-home",
      selections: [
        { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
      ],
      expectedVersion: 0,
      commandKey: "home-propose",
    });
  });

  it("rejects a third official slot and a negative version", () => {
    const slot = {
      officialSlot: 1,
      providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
    };
    const valid = {
      actingTeamId: "team-home",
      selections: [slot],
      expectedVersion: 0,
      commandKey: "k",
    };
    expect(proposeOfficialSelectionRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      proposeOfficialSelectionRequestSchema.safeParse({ ...valid, selections: [slot, slot, slot] })
        .success,
    ).toBe(false);
    expect(
      proposeOfficialSelectionRequestSchema.safeParse({ ...valid, expectedVersion: -1 }).success,
    ).toBe(false);
  });
});
