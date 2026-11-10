import { asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { CompetitionSanction } from "../entities/competition-sanction.ts";
import {
  activePointDeductions,
  parseSanctionReason,
  parseSanctionTerms,
} from "./sanction-terms.ts";

const team = { type: "team", teamId: asTeamId("team-a") } as const;
const player = { type: "player", playerProfileId: "profile-1" } as const;

function fieldOf(result: ReturnType<typeof parseSanctionTerms>) {
  return result.isErr() ? result.error.field : null;
}

describe("parseSanctionTerms", () => {
  it("accepts a warning on a player with a trimmed reason", () => {
    const result = parseSanctionTerms({ target: player, type: "warning", reason: "  Conducta  " });
    expect(result.isOk() && result.value).toEqual({
      target: player,
      type: "warning",
      reason: "Conducta",
      pointsDeducted: null,
      suspensionMatches: null,
      encounterId: null,
    });
  });

  it("requires a reason between 3 and 500 characters", () => {
    expect(fieldOf(parseSanctionTerms({ target: team, type: "warning", reason: " a " }))).toBe(
      "reason",
    );
    expect(
      fieldOf(parseSanctionTerms({ target: team, type: "warning", reason: "x".repeat(501) })),
    ).toBe("reason");
  });

  it("deducts between 1 and 100 whole points, only from a Team", () => {
    const ok = parseSanctionTerms({
      target: team,
      type: "points_deduction",
      reason: "Alineación indebida",
      pointsDeducted: 3,
    });
    expect(ok.isOk() && ok.value.pointsDeducted).toBe(3);
    for (const pointsDeducted of [undefined, 0, 101, 1.5]) {
      expect(
        fieldOf(
          parseSanctionTerms({
            target: team,
            type: "points_deduction",
            reason: "Motivo",
            pointsDeducted,
          }),
        ),
      ).toBe("pointsDeducted");
    }
    expect(
      fieldOf(
        parseSanctionTerms({
          target: player,
          type: "points_deduction",
          reason: "Motivo",
          pointsDeducted: 3,
        }),
      ),
    ).toBe("target");
  });

  it("suspends a Team or a player for 1 to 20 matches", () => {
    const ok = parseSanctionTerms({
      target: player,
      type: "match_suspension",
      reason: "Expulsión",
      suspensionMatches: 2,
    });
    expect(ok.isOk() && ok.value.suspensionMatches).toBe(2);
    expect(
      fieldOf(
        parseSanctionTerms({
          target: player,
          type: "match_suspension",
          reason: "Expulsión",
          suspensionMatches: 21,
        }),
      ),
    ).toBe("suspensionMatches");
  });

  it("declares an administrative defeat on a Team in one encounter", () => {
    const ok = parseSanctionTerms({
      target: team,
      type: "administrative_defeat",
      reason: "No se presentó",
      encounterId: "enc-1",
    });
    expect(ok.isOk() && ok.value.encounterId).toBe("enc-1");
    expect(
      fieldOf(
        parseSanctionTerms({ target: team, type: "administrative_defeat", reason: "Motivo" }),
      ),
    ).toBe("encounterId");
    expect(
      fieldOf(
        parseSanctionTerms({
          target: player,
          type: "administrative_defeat",
          reason: "Motivo",
          encounterId: "enc-1",
        }),
      ),
    ).toBe("target");
  });

  it("rejects details that belong to another type", () => {
    expect(
      fieldOf(
        parseSanctionTerms({ target: team, type: "warning", reason: "Motivo", pointsDeducted: 3 }),
      ),
    ).toBe("pointsDeducted");
    expect(
      fieldOf(
        parseSanctionTerms({
          target: team,
          type: "points_deduction",
          reason: "Motivo",
          pointsDeducted: 3,
          suspensionMatches: 1,
        }),
      ),
    ).toBe("suspensionMatches");
  });
});

describe("parseSanctionReason", () => {
  it("trims and bounds the reason like an imposition", () => {
    const ok = parseSanctionReason("  Error de registro ");
    expect(ok.isOk() && ok.value).toBe("Error de registro");
    expect(parseSanctionReason("no").isErr()).toBe(true);
  });
});

describe("activePointDeductions", () => {
  function sanction(overrides: Partial<CompetitionSanction>): CompetitionSanction {
    return {
      id: "s",
      organizationId: "org" as CompetitionSanction["organizationId"],
      competitionId: "cmp" as CompetitionSanction["competitionId"],
      targetType: "team",
      teamId: asTeamId("team-a"),
      playerProfileId: null,
      type: "points_deduction",
      pointsDeducted: 3,
      suspensionMatches: null,
      encounterId: null,
      reason: "Motivo",
      imposedByActorId: "act" as CompetitionSanction["imposedByActorId"],
      imposedAt: new Date(0),
      requestId: "req",
      revocation: null,
      ...overrides,
    };
  }

  it("sums active deductions per Team and ignores revoked ones and other types", () => {
    const deductions = activePointDeductions([
      sanction({ id: "1" }),
      sanction({ id: "2", pointsDeducted: 2 }),
      sanction({ id: "3", teamId: asTeamId("team-b"), pointsDeducted: 1 }),
      sanction({
        id: "4",
        revocation: { actorId: "act" as never, at: new Date(0), reason: "Error", requestId: "r" },
      }),
      sanction({ id: "5", type: "warning", pointsDeducted: null }),
    ]);
    expect(deductions).toEqual([
      { teamId: "team-a", points: 5 },
      { teamId: "team-b", points: 1 },
    ]);
  });
});
