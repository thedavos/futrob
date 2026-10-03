import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  AWAY_PLAYER,
  COMPETITION,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  STAFF,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const seed = () =>
  seedComposition({ pool: undefined, matches: new InMemoryProviderMatchRepository() });

describe("official selection composition (real resolver, in-memory stores)", () => {
  it("projects statistics exactly once, only when a command approves a result", async () => {
    const { modules, project } = await seed();
    const { officialSelection: selection } = modules;

    const proposed = await selection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
    expect(project).not.toHaveBeenCalled();

    const confirmInput = {
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      commandKey: "confirm",
    };
    const confirmed = await selection.confirm.execute(confirmInput);
    expect(confirmed.isOk() && confirmed.value.selection.status).toBe("approved");
    expect(project).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith({
      officialResultId: confirmed.isOk() ? confirmed.value.approvedResult?.id : "",
    });

    const replay = await selection.confirm.execute(confirmInput);
    expect(replay.isOk() && replay.value.replayed).toBe(true);
    expect(project).toHaveBeenCalledTimes(1);
    expect(await modules.results.results.listByEncounter(ENCOUNTER)).toHaveLength(1);
  });

  it("does not project for proposals, rejections, reviews or a return to selection", async () => {
    const { modules, project } = await seed();
    const { officialSelection: selection } = modules;
    const proposed = await selection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error("propose failed");
    const rejected = await selection.reject.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      reason: "Wrong match",
      commandKey: "reject",
    });
    expect(rejected.isOk() && rejected.value.selection.status).toBe("disputed");
    const reviewed = await selection.reviewDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 2,
      commandKey: "review",
    });
    expect(reviewed.isOk() && reviewed.value.selection.status).toBe("organizer_review");
    const returned = await selection.resolveDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 3,
      decision: { type: "return_to_selection" },
      reason: "Start over",
      commandKey: "return",
    });
    expect(returned.isOk() && returned.value.selection.status).toBe("selection_in_progress");
    expect(project).not.toHaveBeenCalled();
    expect(await modules.results.results.listByEncounter(ENCOUNTER)).toHaveLength(0);
  });

  it("projects an equivalent alternative once and preserves its replay", async () => {
    const { modules, project } = await seed();
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error("propose failed");
    const input = {
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      selections: slot("m-1"),
      reason: "The same match evidence",
      commandKey: "equivalent-alternative",
    };
    const alternative = await modules.officialSelection.proposeAlternative.execute(input);
    expect(alternative.isOk() && alternative.value.approvedResult?.approvalBasis).toBe(
      "team_agreement",
    );
    const replay = await modules.officialSelection.proposeAlternative.execute(input);
    expect(replay.isOk() && replay.value.replayed).toBe(true);
    expect(project).toHaveBeenCalledTimes(1);
    expect(await modules.results.results.listByEncounter(ENCOUNTER)).toHaveLength(1);
  });

  it("resolves a dispute as an operator and projects the approval", async () => {
    const { modules, project } = await seed();
    const { officialSelection: selection } = modules;
    const proposed = await selection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error("propose failed");
    const alternative = await selection.proposeAlternative.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      selections: slot("m-2"),
      reason: "It was the second one",
      commandKey: "alternative",
    });
    if (!alternative.isOk()) throw new Error("alternative failed");
    await selection.reviewDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 2,
      commandKey: "review",
    });
    const resolved = await selection.resolveDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 3,
      decision: { type: "approve_proposal", proposalId: alternative.value.proposal!.id },
      reason: "Evidence checked",
      commandKey: "resolve",
    });
    expect(resolved.isOk() && resolved.value.approvedResult?.approvalBasis).toBe(
      "operator_resolution",
    );
    expect(project).toHaveBeenCalledTimes(1);
  });

  it("uses the real resolver: a player, staff without a grant and a spoofed team are denied", async () => {
    const { modules } = await seed();
    const { officialSelection: selection } = modules;
    const proposed = await selection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error("propose failed");
    const base = {
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
    };
    const attempts = [
      await selection.confirm.execute({ ...base, actorId: AWAY_PLAYER, commandKey: "p" }),
      await selection.confirm.execute({ ...base, actorId: STAFF, commandKey: "s" }),
      await selection.confirm.execute({ ...base, actorId: HOME_CAPTAIN, commandKey: "h" }),
      await selection.confirm.execute({ ...base, actorId: OPERATOR, commandKey: "o" }),
    ];
    expect(attempts.map((attempt) => attempt.isErr() && attempt.error.code)).toEqual([
      "results.official_selection_forbidden",
      "results.official_selection_forbidden",
      "results.official_selection_forbidden",
      "results.official_selection_forbidden",
    ]);
    expect(await modules.results.results.listByEncounter(ENCOUNTER)).toHaveLength(0);

    const view = await selection.get.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
    });
    expect(view.isOk() && view.value.allowedActions).toContain("confirm");
  });

  it("surfaces a projection failure instead of hiding an approval", async () => {
    const { modules, project } = await seed();
    project.mockResolvedValueOnce({
      isOk: () => false,
      error: new Error("projection exploded"),
    } as never);
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error("propose failed");
    await expect(
      modules.officialSelection.confirm.execute({
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.value.proposal!.id,
        expectedVersion: 1,
        commandKey: "confirm",
      }),
    ).rejects.toThrow("projection exploded");
  });
});
