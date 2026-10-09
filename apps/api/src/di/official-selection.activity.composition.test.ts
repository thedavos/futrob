import type { ActivityAudienceRef } from "@futrob/notifications";
import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  NOW,
  OPERATOR,
  ORG,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const ORGANIZATION: ActivityAudienceRef = { audience: "organization", audienceId: ORG };
const AWAY_TEAM: ActivityAudienceRef = { audience: "team", audienceId: AWAY };
const HOME_TEAM: ActivityAudienceRef = { audience: "team", audienceId: HOME };

async function seed() {
  const clock = { value: NOW, now: () => clock.value };
  const seeded = await seedComposition({
    pool: undefined,
    matches: new InMemoryProviderMatchRepository(),
    clock,
  });
  const { modules } = seeded;

  async function listed(audience: ActivityAudienceRef, pendingOnly = false) {
    const result = await modules.notifications.listActivities.execute({
      audiences: [audience],
      ...(pendingOnly ? { status: "open" as const, requiresAction: true } : {}),
    });
    if (!result.isOk()) throw new Error(result.error.code);
    return result.value.items;
  }

  async function propose() {
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
    return proposed.value.proposal!;
  }

  async function openDispute() {
    const input = {
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      expectedVersion: 1,
      reason: "Wrong match",
      commandKey: "dispute",
    };
    const opened = await modules.officialSelection.openDispute.execute(input);
    if (!opened.isOk()) throw new Error(`dispute failed: ${opened.error.code}`);
    return { input, dispute: opened.value.dispute! };
  }

  return { ...seeded, clock, listed, propose, openDispute };
}

describe("official selection activity (composition, in-memory stores)", () => {
  it("asks the rival team to confirm a proposal and watches it for the organization", async () => {
    const { listed, propose } = await seed();
    const proposal = await propose();

    expect(await listed(AWAY_TEAM, true)).toMatchObject([
      {
        kind: "selection_confirmation",
        sourceId: proposal.id,
        resourceType: "encounter",
        resourceId: ENCOUNTER,
        subject: { competitionName: "Copa", encounterLabel: "Home vs Away", teamName: "Away" },
        expiresAt: proposal.confirmationDeadline,
      },
    ]);
    expect(await listed(HOME_TEAM, true)).toEqual([]);
    expect(await listed(ORGANIZATION, true)).toEqual([]);
    expect((await listed(ORGANIZATION)).map((row) => [row.kind, row.status])).toEqual([
      ["selection_confirmation", "open"],
    ]);
  });

  it("opens a dispute once for the organization and closes it on resolution", async () => {
    const { modules, listed, propose, openDispute } = await seed();
    const proposal = await propose();
    const { input, dispute } = await openDispute();
    await modules.officialSelection.openDispute.execute(input);

    const pending = await listed(ORGANIZATION, true);
    expect(pending.map((row) => [row.kind, row.sourceId])).toEqual([["match_dispute", dispute.id]]);
    expect(await listed(AWAY_TEAM, true)).toEqual([]);

    await modules.officialSelection.reviewDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 2,
      commandKey: "review",
    });
    expect((await listed(ORGANIZATION, true)).map((row) => row.sourceId)).toEqual([dispute.id]);

    const resolved = await modules.officialSelection.resolveDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 3,
      decision: { type: "approve_proposal", proposalId: proposal.id },
      reason: "Evidence checked",
      commandKey: "resolve",
    });
    expect(resolved.isOk()).toBe(true);
    expect(await listed(ORGANIZATION, true)).toEqual([]);
    const recent = await listed(ORGANIZATION);
    expect(recent.find((row) => row.sourceId === dispute.id)).toMatchObject({
      status: "closed",
      closedByActorId: OPERATOR,
    });
  });

  it("closes a proposal when the rival confirms it", async () => {
    const { modules, listed, propose } = await seed();
    const proposal = await propose();
    const confirmed = await modules.officialSelection.confirm.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposal.id,
      expectedVersion: 1,
      commandKey: "confirm",
    });
    expect(confirmed.isOk() && confirmed.value.selection.status).toBe("approved");
    expect(await listed(AWAY_TEAM, true)).toEqual([]);
    expect((await listed(ORGANIZATION)).map((row) => [row.kind, row.status])).toEqual([
      ["selection_confirmation", "closed"],
    ]);
  });

  it("closes the first proposal when the rival answers with an alternative", async () => {
    const { modules, listed, propose } = await seed();
    const first = await propose();
    const alternative = await modules.officialSelection.proposeAlternative.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: first.id,
      expectedVersion: 1,
      selections: slot("m-2"),
      reason: "It was the second one",
      commandKey: "alternative",
    });
    if (!alternative.isOk()) throw new Error("alternative failed");
    const status = alternative.value.selection.status;

    expect(await listed(AWAY_TEAM, true)).toEqual([]);
    const pendingForHome = await listed(HOME_TEAM, true);
    expect(pendingForHome.map((row) => row.sourceId)).toEqual(
      status === "awaiting_opponent_confirmation" ? [alternative.value.proposal!.id] : [],
    );
    const firstRow = (await listed(ORGANIZATION)).find((row) => row.sourceId === first.id);
    expect(firstRow).toMatchObject({ status: "closed", closedByActorId: AWAY_CAPTAIN });
  });

  it("closes the proposal when the rival rejects it", async () => {
    const { modules, listed, propose } = await seed();
    const proposal = await propose();
    const rejected = await modules.officialSelection.reject.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposal.id,
      expectedVersion: 1,
      reason: "Not this one",
      commandKey: "reject",
    });
    expect(rejected.isOk()).toBe(true);
    expect(await listed(AWAY_TEAM, true)).toEqual([]);
    expect((await listed(AWAY_TEAM))[0]).toMatchObject({
      status: "closed",
      closedByActorId: AWAY_CAPTAIN,
    });
  });

  it("closes the proposal when its confirmation window expires", async () => {
    const { modules, clock, listed, propose } = await seed();
    const proposal = await propose();
    clock.value = new Date(proposal.confirmationDeadline.getTime() + 60_000);
    const expired = await modules.officialSelection.expire.execute({
      actorId: asActorId("actor-system"),
      organizationId: ORG,
      encounterId: ENCOUNTER,
      proposalId: proposal.id,
    });
    expect(expired.isOk() && expired.value.status).toBe("expired");
    expect((await listed(AWAY_TEAM))[0]).toMatchObject({
      status: "closed",
      closedAt: clock.value,
      closedByActorId: null,
    });
  });
});
