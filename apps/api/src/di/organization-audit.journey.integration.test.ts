import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { createFutrobClient } from "@futrob/sdk";
import { createApp } from "@/app.ts";
import { createModules } from "./create-modules.ts";
import { createFetch, INTERNAL_JOB_SECRET } from "@/http/http-app.harness.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("AC-E2E-001 audit journey", () => {
  let isolated: IsolatedSchema;
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "audit_journey");
    await migrateIsolatedSchema(isolated.pool);
  });
  afterAll(async () => {
    await isolated?.drop();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retains creation, clubs, rosters, publication, fixture, durable sync and approval in order without replay duplicates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T22:00:00.000Z"));
    const owner = "audit-journey-owner";
    const homeCaptain = "audit-journey-home";
    const awayCaptain = "audit-journey-away";
    await seedActors(isolated.pool, owner, homeCaptain, awayCaptain);
    let tick = 0;
    let providerCalls = 0;
    const clock = {
      now: () => {
        const value = new Date(Date.UTC(2026, 10, 11, 22, 0, tick++));
        vi.setSystemTime(value);
        return value;
      },
    };
    const modules = createModules({
      pool: isolated.pool,
      clock,
      eaClubsBaseUrl: "https://example.test",
      fetcher: async () => {
        providerCalls++;
        return Response.json(
          ["match-1", "match-2"].map((matchId, index) => ({
            matchId,
            timestamp: Date.UTC(2026, 10, 11, 20, index * 10) / 1000,
            clubs: {
              "club-home": { goals: "2", details: { name: "Home", clubId: "club-home" } },
              "club-away": { goals: "1", details: { name: "Away", clubId: "club-away" } },
            },
            players: {},
          })),
        );
      },
    });
    const app = createApp({
      modules,
      internalJobSecret: INTERNAL_JOB_SECRET,
      checkDbHealth: async () => "ok",
      correlationLogger: { info: () => {}, error: () => {} },
    });
    const client = (actorId: string) =>
      createFutrobClient({
        baseUrl: "http://localhost/api/v1",
        fetchImpl: createFetch((url, init) => app.request(url, init)),
        getAccessToken: () => INTERNAL_JOB_SECRET,
        getExtraHeaders: () => ({ "X-Futrob-Actor-Id": actorId }),
      });
    const organizer = client(owner);
    const org = await organizer.organizations.create({ name: "Audit journey", timeZone: "UTC" });
    const organizationId = org.organizationId;
    const draft = await organizer.competitions.createDraft(organizationId, {
      name: "Two match league",
      format: "league",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "UTC",
    });
    const competitionId = draft.competition.id;
    await organizer.competitions.updateDraft(organizationId, competitionId, {
      name: "Two match league",
      format: "league",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "UTC",
      rules: {
        regularStage: {
          officialMatchesPerEncounter: 2,
          resolutionMode: "independent_matches",
          winPoints: 3,
          drawPoints: 1,
          lossPoints: 0,
          allowRescheduling: true,
          maxReschedulesPerTeam: 2,
          minimumRescheduleNoticeHours: 12,
          rescheduleProposalExpiryHours: 12,
          rescheduleRequiresOpponentApproval: true,
          rescheduleRequiresOrganizerApproval: false,
        },
        knockoutStage: null,
        maxRosterSize: 16,
      },
    });
    const home = await organizer.teams.createTeam(organizationId, { name: "Home" });
    const away = await organizer.teams.createTeam(organizationId, { name: "Away" });
    const approvedEntryIds: string[] = [];
    for (const [team, captain, externalClubId] of [
      [home, homeCaptain, "club-home"],
      [away, awayCaptain, "club-away"],
    ] as const) {
      const entry = await organizer.competitions.registerTeamEntry(organizationId, competitionId, {
        teamId: team.id,
      });
      await organizer.competitions.approveTeamEntry(organizationId, competitionId, entry.id);
      approvedEntryIds.push(entry.id);
      await organizer.teams.connectExternalClub(organizationId, competitionId, team.id, {
        providerKey: "ea-clubs",
        externalClubId,
        externalClubName: team.name,
        gameEdition: "fc26",
        platform: "common-gen5",
      });
      const account = await client(captain).teams.addMyGameAccount({
        identifier: captain,
        platform: "playstation",
        gameEdition: "fc26",
      });
      await organizer.teams.addToRoster(organizationId, competitionId, team.id, {
        playerProfileId: account.profile.id,
        gameAccountId: account.gameAccount.id,
        role: "captain",
      });
    }
    await organizer.competitions.publish(organizationId, competitionId);
    const generation = {
      generationVersion: 1,
      startsAt: "2026-11-11T20:00:00Z",
      roundIntervalDays: 7,
      homeAndAway: false,
    };
    const fixture = await organizer.encounters.generateFixture(
      organizationId,
      competitionId,
      generation,
    );
    await organizer.encounters.generateFixture(organizationId, competitionId, generation);
    const encounter = fixture.stages[0]?.rounds[0]?.encounters[0];
    if (!encounter) throw new Error("Expected generated encounter");
    const job = await organizer.gameData.syncJobs.enqueue({
      organizationId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    });
    const completed = await organizer.gameData.syncJobs.run(job.id);
    expect(completed.status).toBe("succeeded");
    await organizer.gameData.syncJobs.run(job.id);
    expect(providerCalls).toBe(1);
    const proposingCaptain =
      encounter.home.kind === "team" && encounter.home.teamId === home.id
        ? homeCaptain
        : awayCaptain;
    const confirmingCaptain = proposingCaptain === homeCaptain ? awayCaptain : homeCaptain;
    const proposingTeam = proposingCaptain === homeCaptain ? home : away;
    const confirmingTeam = proposingCaptain === homeCaptain ? away : home;
    const proposal = await client(proposingCaptain).results.proposeOfficialSelection(
      organizationId,
      encounter.id,
      {
        actingTeamId: proposingTeam.id,
        expectedVersion: 0,
        commandKey: "audit-journey-proposal",
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" } },
          { officialSlot: 2, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-2" } },
        ],
      },
    );
    if (!proposal.proposal) throw new Error("Expected proposal");
    const confirmation = {
      actingTeamId: confirmingTeam.id,
      expectedVersion: proposal.selection.version,
      commandKey: "audit-journey-confirm",
    };
    const confirmed = await client(confirmingCaptain).results.confirmOfficialSelection(
      organizationId,
      encounter.id,
      proposal.proposal.id,
      confirmation,
    );
    expect(confirmed.selection.status).toBe("approved");
    const beforeReplay = await organizer.audit.list(organizationId, { limit: 100 });
    await client(confirmingCaptain).results.confirmOfficialSelection(
      organizationId,
      encounter.id,
      proposal.proposal.id,
      confirmation,
    );
    const afterReplay = await organizer.audit.list(organizationId, { limit: 100 });
    expect(afterReplay).toEqual(beforeReplay);
    const chronological = [...afterReplay.entries].reverse();
    const actions = chronological.map((entry) => entry.action);
    for (const action of [
      "organizations.created",
      "competitions.created",
      "teams.created",
      "competitions.entry_registered",
      "competitions.entry_approved",
      "teams.external_club_connected",
      "teams.roster_member_added",
      "competitions.published",
      "scheduling.fixture_generated",
      "game_data.sync_queued",
      "game_data.sync_completed",
      "results.proposed",
      "results.confirmed",
      "results.approved",
    ])
      expect(actions).toContain(action);
    const approvedEntries = afterReplay.entries.filter(
      (entry) => entry.action === "competitions.entry_approved",
    );
    expect(approvedEntries.map((entry) => entry.id).sort()).toEqual(
      approvedEntryIds.map((id) => `05:entry-decision:${id}`).sort(),
    );
    for (const entry of approvedEntries) {
      expect(entry).toMatchObject({
        organizationId,
        competitionId,
        actorId: owner,
        object: {
          type: "competition",
          id: competitionId,
          href: `/orgs/${organizationId}/competitions/${competitionId}`,
        },
      });
      expect(
        entry.occurredAt <=
          (afterReplay.entries.find((fact) => fact.action === "competitions.published")
            ?.occurredAt ?? ""),
      ).toBe(true);
    }
    const decisionFilter = await organizer.audit.list(organizationId, {
      competitionId,
      actorId: owner,
      action: "competitions.entry_approved",
    });
    expect(decisionFilter.entries).toEqual(approvedEntries);
    const sequence = [
      "competitions.published",
      "scheduling.fixture_generated",
      "game_data.sync_queued",
      "game_data.sync_completed",
      "results.proposed",
      "results.confirmed",
      "results.approved",
    ].map((action) => actions.indexOf(action));
    expect(sequence).toEqual([...sequence].sort((left, right) => left - right));
    expect(actions.filter((action) => action === "scheduling.fixture_generated")).toHaveLength(1);
    expect(actions.filter((action) => action === "game_data.sync_completed")).toHaveLength(1);
    expect(actions.filter((action) => action === "results.approved")).toHaveLength(1);
    expect(afterReplay.entries.find((entry) => entry.action === "results.proposed")).toMatchObject({
      actorId: proposingCaptain,
      object: {
        href: `/orgs/${organizationId}/competitions/${competitionId}/encounters/${encodeURIComponent(encounter.id)}`,
      },
    });
    expect(
      afterReplay.entries.find((entry) => entry.action === "scheduling.fixture_generated"),
    ).toMatchObject({
      actorId: owner,
      object: { href: `/orgs/${organizationId}/competitions/${competitionId}/fixture` },
    });
  });
});
