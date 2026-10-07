import { describe, expect, it } from "vite-plus/test";
import {
  officialSelectionActionSchema,
  proposeOfficialSelectionRequestSchema,
  resolveMatchDisputeRequestSchema,
  reviewMatchDisputeRequestSchema,
} from "./schemas.ts";

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
  it("normalizes operator reasons and keys, preserving the exact proposal and flag acknowledgement", () => {
    expect(
      resolveMatchDisputeRequestSchema.parse({
        actorId: "actor-forged",
        actingTeamId: "team-forged",
        role: "superuser",
        expectedVersion: 3,
        commandKey: "  operator-resolve  ",
        reason: "  Marcador 2-1 validado  ",
        decision: {
          type: "approve_proposal",
          proposalId: "proposal-1",
          acknowledgeIntegrityFlags: true,
        },
      }),
    ).toEqual({
      expectedVersion: 3,
      commandKey: "operator-resolve",
      reason: "Marcador 2-1 validado",
      decision: {
        type: "approve_proposal",
        proposalId: "proposal-1",
        acknowledgeIntegrityFlags: true,
      },
    });
    expect(
      reviewMatchDisputeRequestSchema.parse({
        expectedVersion: 2,
        commandKey: "review",
        reason: "  Revisar marcador  ",
      }),
    ).toEqual({ expectedVersion: 2, commandKey: "review", reason: "Revisar marcador" });
  });

  it("requires a nonblank operator reason and a proposal only for approval", () => {
    const body = {
      expectedVersion: 3,
      commandKey: "return",
      reason: "Rehacer selección",
      decision: { type: "return_to_selection" },
    };
    expect(resolveMatchDisputeRequestSchema.parse(body)).toEqual({
      expectedVersion: 3,
      commandKey: "return",
      reason: "Rehacer selección",
      decision: { type: "return_to_selection" },
    });
    for (const invalid of [
      { ...body, reason: " " },
      { ...body, expectedVersion: -1 },
      { ...body, commandKey: "" },
      { ...body, decision: { type: "approve_proposal" } },
      {
        ...body,
        decision: {
          type: "approve_proposal",
          proposalId: "proposal-1",
          acknowledgeIntegrityFlags: "true",
        },
      },
    ]) {
      expect(resolveMatchDisputeRequestSchema.safeParse(invalid).success).toBe(false);
    }
    for (const reason of [undefined, " "]) {
      expect(
        reviewMatchDisputeRequestSchema.safeParse({
          expectedVersion: 2,
          commandKey: "review",
          reason,
        }).success,
      ).toBe(false);
    }
  });

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
