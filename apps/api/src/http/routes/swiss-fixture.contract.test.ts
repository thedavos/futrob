import {
  fixturePlanSchema,
  getPublicStandingsResponseSchema,
  getCompetitionStandingsResponseSchema,
  type FixturePlanDto,
} from "@futrob/api-contracts";
import { asActorId, asCompetitionId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  buildAppWithModules,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { createOrganizationCompetitionFixture } from "@/http/organization-competition.fixture.ts";
import { parseResponse } from "@/http/parse-response.ts";

const ORGANIZER = "actor-swiss-organizer";
const SUPERUSER = "actor-swiss-superuser";
const OUTSIDER = "actor-swiss-outsider";
const WITHDRAW_PATH =
  "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/swiss/withdrawals";
const CLOSE_PATH =
  "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/swiss/rounds/{roundNumber}/close";

const SWISS_RULES = {
  regularStage: {
    officialMatchesPerEncounter: 1,
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
};

async function setup() {
  const { app, modules } = buildAppWithModules(stubFetch);
  await modules.organizations.repositories.platformRoles.assignSuperuser({
    actorId: asActorId(SUPERUSER),
    role: "superuser",
    assignedByActorId: asActorId(SUPERUSER),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const created = await createOrganizationCompetitionFixture(app, {
    method: "POST",
    headers: serviceHeaders(ORGANIZER),
    body: JSON.stringify({
      name: "Swiss Org",
      competition: onboardingCompetition,
      gameAccount: null,
    }),
  });
  const { organizationId } = created;
  const competitionId = created.competition.competition.id;
  const base = `/api/v1/organizations/${organizationId}/competitions/${competitionId}`;
  const setFormat = () =>
    app.request(base, {
      method: "PATCH",
      headers: serviceHeaders(ORGANIZER),
      body: JSON.stringify({ ...onboardingCompetition, format: "swiss", rules: SWISS_RULES }),
    });
  const post = (path: string, body: object, actor = ORGANIZER) =>
    app.request(`${base}${path}`, {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify(body),
    });
  return { app, base, modules, organizationId, competitionId, post, setFormat };
}

type Setup = Awaited<ReturnType<typeof setup>>;

async function publishedSwiss(context: Setup, teamCount = 4): Promise<FixturePlanDto> {
  const assigned = await context.app.request(
    `/api/v1/organizations/${context.organizationId}/billing/plan`,
    {
      method: "PUT",
      headers: serviceHeaders(SUPERUSER),
      body: JSON.stringify({
        planKey: "pro",
        state: { status: "active" },
        reason: "Swiss contract test",
      }),
    },
  );
  expect(assigned.status).toBe(200);
  expect((await context.setFormat()).status).toBe(200);
  for (let index = 0; index < teamCount; index += 1) {
    const added = await context.post("/participants", {
      kind: "new-team",
      name: `Swiss Team ${index}`,
      creationKey: `swiss-${index}`,
    });
    expect(added.status).toBeLessThan(300);
  }
  expect((await context.post("/publish", {})).status).toBeLessThan(300);
  const generated = await context.post("/fixture", {
    generationVersion: 1,
    startsAt: "2030-09-01T01:00:00.000Z",
    roundIntervalDays: 7,
    homeAndAway: false,
    swiss: { rounds: 2 },
  });
  expect(generated.status).toBe(200);
  return parseResponse(fixturePlanSchema, generated);
}

describe("Swiss fixture HTTP contract", () => {
  it("refuses the format on the free plan with an upsell", async () => {
    const context = await setup();
    const response = await context.setFormat();
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "competitions.format_not_in_plan" });
  });

  it("generates only the first round and rejects an out-of-range count", async () => {
    const context = await setup();
    const fixture = await publishedSwiss(context);
    expect(fixture).toMatchObject({ format: "swiss", stages: [{ kind: "swiss" }] });
    expect(fixture.stages[0]?.rounds.map((round) => round.encounters.length)).toEqual([2, 0]);

    const invalid = await context.post("/fixture", {
      generationVersion: 2,
      startsAt: "2030-09-01T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: false,
      swiss: { rounds: 3 },
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      code: "scheduling.invalid_fixture_configuration",
    });
  });

  it("withdraws a Team, replays, and matches the OpenAPI document", async () => {
    const context = await setup();
    const fixture = await publishedSwiss(context);
    const teamId = fixture.seed[0];
    const path = `/fixtures/${fixture.id}/swiss/withdrawals`;
    const body = {
      teamId,
      reason: "Dropped out",
      requestId: "11111111-1111-4111-8111-111111111111",
    };

    const response = await context.post(path, body);

    await expectMatchesOpenApi(response.clone(), "post", WITHDRAW_PATH);
    const updated = await parseResponse(fixturePlanSchema, response);
    expect(updated.withdrawnTeamIds).toEqual([teamId]);
    const table = updated.stages[0]?.rounds[0]?.encounters[0];
    expect(table).toMatchObject({ away: { kind: "bye" }, series: null });

    const replay = await context.post(path, body);
    expect(replay.status).toBe(200);
    expect((await parseResponse(fixturePlanSchema, replay)).revision).toBe(updated.revision);
  });

  it("closes the current round and takes it out of the private and public lists", async () => {
    const context = await setup();
    const fixture = await publishedSwiss(context);

    const response = await context.post(`/fixtures/${fixture.id}/swiss/rounds/1/close`, {
      reason: "Deadline passed",
    });

    await expectMatchesOpenApi(response.clone(), "post", CLOSE_PATH);
    const updated = await parseResponse(fixturePlanSchema, response);
    const [first, second] = updated.stages[0]?.rounds ?? [];
    expect(first?.encounters).toMatchObject([
      { series: null, closedWithoutResult: true, home: { kind: "team" }, away: { kind: "team" } },
      { series: null, closedWithoutResult: true },
    ]);
    expect(second?.encounters).toHaveLength(2);

    const list = await context.app.request(`${context.base}/encounters`, {
      headers: serviceHeaders(ORGANIZER),
    });
    expect(list.status).toBe(200);
    const listed = (await list.json()) as { encounters: { encounterId: string }[] };
    const closedIds = new Set(first?.encounters.map((encounter) => encounter.id));
    expect(listed.encounters.length).toBeGreaterThan(0);
    expect(listed.encounters.filter((item) => closedIds.has(item.encounterId))).toEqual([]);
  });

  it("maps expected failures to their stable codes", async () => {
    const context = await setup();
    const fixture = await publishedSwiss(context);
    const close = (round: string | number, actor?: string) =>
      context.post(
        `/fixtures/${fixture.id}/swiss/rounds/${round}/close`,
        { reason: "Late" },
        actor,
      );
    const withdrawal = (teamId: string) =>
      context.post(`/fixtures/${fixture.id}/swiss/withdrawals`, { teamId, reason: "Gone" });

    const notCurrent = await close(2);
    expect(notCurrent.status).toBe(409);
    expect(await notCurrent.json()).toMatchObject({ code: "scheduling.swiss_round_not_current" });

    const malformed = await close("abc");
    expect(malformed.status).toBe(409);

    const stranger = await withdrawal("stranger");
    expect(stranger.status).toBe(400);
    expect(await stranger.json()).toMatchObject({ code: "scheduling.swiss_team_not_participant" });

    const forbidden = await close(1, OUTSIDER);
    expect(forbidden.status).toBe(403);
    await expectMatchesOpenApi(forbidden.clone(), "post", CLOSE_PATH);
    expect(await forbidden.json()).toMatchObject({ code: "authorization.forbidden" });

    const missingReason = await context.post(`/fixtures/${fixture.id}/swiss/rounds/1/close`, {});
    expect(missingReason.status).toBe(400);
  });

  it("serves negative Buchholz on private and public standings after a deduction", async () => {
    const context = await setup();
    const fixture = await publishedSwiss(context);
    const encounter = fixture.stages[0]!.rounds[0]!.encounters[0]!;
    if (encounter.home.kind !== "team" || encounter.away.kind !== "team")
      throw new Error("Expected a paired table");
    await context.modules.results.results.append({
      id: "swiss-sanction-result",
      encounterId: asEncounterId(encounter.id),
      organizationId: asOrganizationId(context.organizationId),
      competitionId: asCompetitionId(context.competitionId),
      revision: 1,
      status: "approved",
      approvedAt: new Date("2030-09-01T03:00:00Z"),
      approvedBy: asActorId(ORGANIZER),
      slots: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "swiss-sanction-match" },
          homeExternalClubId: "swiss-home",
          awayExternalClubId: "swiss-away",
          homeGoals: 1,
          awayGoals: 0,
          occurredAt: new Date("2030-09-01T02:00:00Z"),
          gameEdition: "fc26",
          platform: "playstation",
          players: [],
        },
      ],
    });
    const opponentTeamId = encounter.away.teamId;
    const imposed = await context.post("/sanctions", {
      target: { type: "team", teamId: encounter.home.teamId },
      type: "points_deduction",
      pointsDeducted: 6,
      reason: "Ineligible lineup",
    });
    expect(imposed.status).toBe(201);
    const privateResponse = await context.app.request(`${context.base}/standings`, {
      headers: serviceHeaders(ORGANIZER),
    });
    expect(privateResponse.status).toBe(200);
    const privateTable = await parseResponse(
      getCompetitionStandingsResponseSchema,
      privateResponse,
    );
    expect(
      privateTable.standings?.rows.find((row) => row.teamId === opponentTeamId)?.swiss?.buchholz,
    ).toBe(-3);
    const organization = await context.modules.organizations.repositories.organizations.getById(
      asOrganizationId(context.organizationId),
    );
    if (!organization) throw new Error("organization fixture missing");
    const publicResponse = await context.app.request(
      `/api/v1/public/organizations/${organization.slug}/competitions/${context.competitionId}/standings`,
    );
    expect(publicResponse.status).toBe(200);
    const publicTable = await parseResponse(getPublicStandingsResponseSchema, publicResponse);
    expect(publicTable.standings.rows.some((row) => row.buchholz === -3)).toBe(true);
  });

  it("has no table before any official result", async () => {
    const context = await setup();
    await publishedSwiss(context);
    const standings = await context.app.request(`${context.base}/standings`, {
      headers: serviceHeaders(ORGANIZER),
    });
    expect(standings.status).toBe(200);
    expect(await parseResponse(getCompetitionStandingsResponseSchema, standings)).toEqual({
      standings: null,
    });
  });
});
