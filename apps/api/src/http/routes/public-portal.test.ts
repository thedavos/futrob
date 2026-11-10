import { createOrganizationCompetitionFixture } from "@/http/organization-competition.fixture.ts";
import {
  apiErrorSchema,
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
  getPublicBracketResponseSchema,
  getPublicRankingResponseSchema,
  getPublicRulesResponseSchema,
  getPublicTeamsResponseSchema,
  type GetPublicCalendarResponse,
} from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type TeamId,
} from "@futrob/shared-kernel";
import { parseOrganizationSlug } from "@futrob/organizations";
import { COMPETITION_STANDING_FORMULA_VERSION, RANKING_FORMULA_VERSION } from "@futrob/statistics";
import { describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";
import { PUBLIC_READ_CACHE_CONTROL } from "@/utils/http-response.ts";

const ORGANIZER = "actor-public-organizer";
const EXTERNAL_MATCH_ID = "ea-match-secret-9931";
const EXTERNAL_CLUB_ID = "ea-club-secret-7712";
const PLAYER_NAME = "ea-player-secret-name";

const PORTADA_KEYS = [
  "approvedTeamCount",
  "coverPreset",
  "endsOn",
  "format",
  "gameEdition",
  "name",
  "platform",
  "region",
  "startsOn",
  "status",
  "timeZone",
];

const rules = {
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

async function setup(options: {
  readonly publish: boolean;
  readonly format?: "league" | "knockout";
}) {
  const format = options.format ?? "league";
  const competitionRules =
    format === "knockout"
      ? { ...rules, regularStage: null, knockoutStage: rules.regularStage }
      : rules;
  const modules = createModules({
    pool: undefined,
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://provider.invalid",
  });
  const app = createApp({
    modules,
    correlationLogger: { info() {}, error() {} },
    internalJobSecret: INTERNAL_JOB_SECRET,
    checkDbHealth: async () => "skipped",
  });
  const privateRequest = (path: string, init: RequestInit = {}) =>
    app.request(`/api/v1${path}`, { ...init, headers: serviceHeaders(ORGANIZER) });

  const created = await createOrganizationCompetitionFixture(app, {
    headers: serviceHeaders(ORGANIZER),
    method: "POST",
    body: JSON.stringify({
      name: "Organizacion Privada SAC",
      competition: { ...onboardingCompetition, name: "Copa Barranco", format },
      gameAccount: null,
    }),
  });
  const { organizationId } = created;
  const competitionId = created.competition.competition.id;
  const base = `/organizations/${organizationId}/competitions/${competitionId}`;
  await privateRequest(base, {
    method: "PATCH",
    body: JSON.stringify({
      ...onboardingCompetition,
      name: "Copa Barranco",
      format,
      rules: competitionRules,
    }),
  });
  for (const [name, creationKey] of [
    ["Barranco FC", "public-alpha"],
    ["Surquillo United", "public-beta"],
    ["Miraflores CF", "public-gamma"],
  ] as const) {
    await privateRequest(`${base}/participants`, {
      method: "POST",
      body: JSON.stringify({ kind: "new-team", name, creationKey }),
    });
  }
  if (options.publish) {
    expect((await privateRequest(`${base}/publish`, { method: "POST" })).status).toBe(200);
    const fixture = await privateRequest(`${base}/fixture`, {
      method: "POST",
      body: JSON.stringify({
        generationVersion: 1,
        startsAt: "2026-09-01T01:00:00.000Z",
        roundIntervalDays: 7,
        homeAndAway: false,
      }),
    });
    expect(fixture.status).toBe(200);
  }
  const organization = await modules.organizations.repositories.organizations.getById(
    asOrganizationId(organizationId),
  );
  if (!organization) throw new Error("organization fixture missing");
  const anonymous = (path: string) =>
    app.request(`/api/v1/public/organizations/${organization.slug}/competitions${path}`);
  return { app, modules, organizationId, competitionId, base, slug: organization.slug, anonymous };
}

const PUBLIC_SUFFIXES = [
  "",
  "/standings",
  "/calendar",
  "/teams",
  "/rules",
  "/bracket",
  "/rankings/scorer",
];

const PUBLIC_PATH = "/public/organizations/{organizationSlug}/competitions/{competitionKey}";

describe("public portal reads", () => {
  it("serves the portada to an anonymous caller with only allowlisted keys", async () => {
    const { anonymous, organizationId, competitionId } = await setup({ publish: true });

    const response = await anonymous(`/${competitionId}`);

    expect(response.status).toBe(200);
    await expectMatchesOpenApi(response, "get", PUBLIC_PATH);
    expect(response.headers.get("cache-control")).toBe(PUBLIC_READ_CACHE_CONTROL);
    expect(response.headers.get("set-cookie")).toBeNull();
    const raw = await response.clone().text();
    const body = await parseResponse(getPublicCompetitionResponseSchema, response);
    expect(Object.keys(body)).toEqual(["competition"]);
    expect(Object.keys(body.competition).sort()).toEqual(PORTADA_KEYS);
    expect(body.competition).toMatchObject({
      name: "Copa Barranco",
      status: "published",
      approvedTeamCount: 3,
    });
    for (const secret of [
      organizationId,
      ORGANIZER,
      "Organizacion Privada SAC",
      "organizationId",
      "createdByActorId",
      "creationKey",
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("answers 404 for an unpublished competition on every public resource, revealing nothing", async () => {
    const { anonymous, competitionId } = await setup({ publish: false });

    for (const suffix of PUBLIC_SUFFIXES) {
      const response = await anonymous(`/${competitionId}${suffix}`);
      expect(response.status).toBe(404);
      await expectMatchesOpenApi(
        response,
        "get",
        `${PUBLIC_PATH}${suffix.replace("/scorer", "/{kind}")}`,
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      const raw = await response.clone().text();
      expect(await response.json()).toMatchObject({ code: "public_portal.competition_not_found" });
      for (const hidden of ["Copa Barranco", "Barranco FC", "organizationId", ORGANIZER]) {
        expect(raw).not.toContain(hidden);
      }
    }
  });

  it("keeps a competition in registration out of the portal even though signed-in actors can discover it", async () => {
    const { app, anonymous, competitionId, base } = await setup({ publish: false });
    const open = await app.request(`/api/v1${base}/registration/open`, {
      method: "POST",
      headers: serviceHeaders(ORGANIZER),
    });
    expect(open.status).toBe(200);
    const discoverable = await app.request(`/api/v1/competitions/explore/${competitionId}`, {
      headers: serviceHeaders("actor-visitor"),
    });
    expect(discoverable.status).toBe(200);

    for (const suffix of PUBLIC_SUFFIXES) {
      const response = await anonymous(`/${competitionId}${suffix}`);
      expect({ suffix, status: response.status }).toEqual({ suffix, status: 404 });
    }
  });

  it("makes a missing competition indistinguishable from an unpublished one", async () => {
    const { anonymous, competitionId } = await setup({ publish: false });

    const draft = await anonymous(`/${competitionId}`);
    const missing = await anonymous("/does-not-exist");

    expect(missing.status).toBe(draft.status);
    const { requestId: _missingRequest, ...missingBody } = apiErrorSchema.parse(
      await missing.json(),
    );
    const { requestId: _draftRequest, ...draftBody } = apiErrorSchema.parse(await draft.json());
    expect(missingBody).toEqual(draftBody);
  });

  it("serves the calendar with public names only, hiding fixture and result internals", async () => {
    const { anonymous, modules, organizationId, competitionId } = await setup({ publish: true });
    const plans = await modules.scheduling.fixturePlans.listActive(
      asOrganizationId(organizationId),
      asCompetitionId(competitionId),
    );
    const firstEncounter = plans[0]?.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(firstEncounter).toBeDefined();
    if (!firstEncounter) return;
    await modules.results.results.append({
      id: "official-result-secret-id",
      encounterId: firstEncounter.id,
      organizationId: asOrganizationId(organizationId),
      competitionId: asCompetitionId(competitionId),
      revision: 1,
      status: "approved",
      approvedAt: new Date("2026-09-02T00:00:00Z"),
      approvedBy: asActorId("approver-secret-actor"),
      slots: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: EXTERNAL_MATCH_ID },
          homeExternalClubId: EXTERNAL_CLUB_ID,
          awayExternalClubId: "ea-club-other",
          homeGoals: 3,
          awayGoals: 1,
          occurredAt: new Date("2026-09-01T02:00:00Z"),
          gameEdition: "fc26",
          platform: "playstation",
          players: [
            {
              externalPlayerId: "ea-player-id",
              displayName: PLAYER_NAME,
              externalClubId: EXTERNAL_CLUB_ID,
              position: null,
              minutesPlayed: 90,
              goals: 1,
              assists: null,
              shots: null,
              passAttempts: null,
              passesMade: null,
              tackleAttempts: null,
              tacklesMade: null,
              saves: null,
              yellowCards: null,
              redCards: null,
              isMvp: null,
              rating: null,
            },
          ],
        },
      ],
    });

    const response = await anonymous(`/${competitionId}/calendar`);

    expect(response.status).toBe(200);
    await expectMatchesOpenApi(response, "get", `${PUBLIC_PATH}/calendar`);
    expect(response.headers.get("cache-control")).toBe(PUBLIC_READ_CACHE_CONTROL);
    const raw = await response.clone().text();
    const body: GetPublicCalendarResponse = await parseResponse(
      getPublicCalendarResponseSchema,
      response,
    );
    expect(body.calendar.timeZone).toBe("America/Lima");
    expect(body.calendar.entries).toHaveLength(3);
    const names = new Set(["Barranco FC", "Surquillo United", "Miraflores CF"]);
    for (const entry of body.calendar.entries) {
      expect(Object.keys(entry).sort()).toEqual([
        "awayTeamName",
        "homeTeamName",
        "roundNumber",
        "scheduledStartAt",
        "score",
        "status",
      ]);
      expect(names.has(entry.homeTeamName)).toBe(true);
      expect(names.has(entry.awayTeamName)).toBe(true);
    }
    expect(
      body.calendar.entries
        .filter((entry) => entry.status === "official")
        .map((entry) => entry.score),
    ).toEqual([[{ homeGoals: 3, awayGoals: 1 }]]);
    expect(body.calendar.entries.map((entry) => entry.scheduledStartAt)).toEqual(
      [...body.calendar.entries.map((entry) => entry.scheduledStartAt)].sort(),
    );
    for (const secret of [
      EXTERNAL_MATCH_ID,
      EXTERNAL_CLUB_ID,
      PLAYER_NAME,
      "official-result-secret-id",
      "approver-secret-actor",
      "slots",
      "providerMatchRef",
      "approvedBy",
      "candidates",
      "fixturePlanId",
      firstEncounter.id,
      organizationId,
      competitionId,
    ]) {
      expect(raw).not.toContain(secret);
    }
    expect(raw).not.toContain(plans[0]?.id ?? "missing-plan");
  });

  it("serves an empty table before any result and the official table after projection", async () => {
    const { anonymous, modules, organizationId, competitionId } = await setup({ publish: true });
    const empty = await anonymous(`/${competitionId}/standings`);
    expect(empty.status).toBe(200);
    await expectMatchesOpenApi(empty, "get", `${PUBLIC_PATH}/standings`);
    expect(await empty.json()).toEqual({ standings: { rows: [], swiss: null, updatedAt: null } });

    const plans = await modules.scheduling.fixturePlans.listActive(
      asOrganizationId(organizationId),
      asCompetitionId(competitionId),
    );
    const teamIds = [
      ...new Set(
        plans
          .flatMap((plan) => plan.stages)
          .flatMap((stage) => stage.rounds)
          .flatMap((round) => round.encounters)
          .flatMap((encounter) => [encounter.home, encounter.away])
          .flatMap((slot): TeamId[] => (slot.kind === "team" ? [slot.teamId] : [])),
      ),
    ];
    expect(teamIds).toHaveLength(3);
    await modules.statistics.ports.standings.upsert({
      competitionId: asCompetitionId(competitionId),
      organizationId: asOrganizationId(organizationId),
      formulaVersion: COMPETITION_STANDING_FORMULA_VERSION,
      rows: teamIds.map((teamId, index) => ({
        position: index + 1,
        teamId,
        played: 2,
        wins: 2 - index,
        draws: 0,
        losses: index,
        goalsFor: 4 - index,
        goalsAgainst: index,
        goalDifference: 4 - 2 * index,
        points: 6 - 3 * index,
        form: index === 0 ? ["win", "win"] : ["loss", "win"],
      })),
      sourceRevisionMax: 42,
      updatedAt: new Date("2026-09-08T20:00:00.000Z"),
    });

    const response = await anonymous(`/${competitionId}/standings`);

    expect(response.status).toBe(200);
    const raw = await response.clone().text();
    const body = await parseResponse(getPublicStandingsResponseSchema, response);
    expect(body.standings.updatedAt).toBe("2026-09-08T20:00:00.000Z");
    expect(body.standings.rows.map((row) => row.position)).toEqual([1, 2, 3]);
    expect(body.standings.rows.map((row) => row.points)).toEqual([6, 3, 0]);
    expect(body.standings.rows.map((row) => row.form)).toEqual([
      ["win", "win"],
      ["loss", "win"],
      ["loss", "win"],
    ]);
    for (const row of body.standings.rows) {
      expect(Object.keys(row).sort()).toEqual([
        "draws",
        "form",
        "goalDifference",
        "goalsAgainst",
        "goalsFor",
        "losses",
        "played",
        "points",
        "position",
        "teamName",
        "wins",
      ]);
    }
    for (const secret of [
      ...teamIds,
      organizationId,
      competitionId,
      "organizationId",
      "teamId",
      "playerProfileId",
      "formulaVersion",
      "sourceRevisionMax",
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("treats a snapshot stored under another organization as absent", async () => {
    const { anonymous, modules, competitionId } = await setup({ publish: true });
    await modules.statistics.ports.standings.upsert({
      competitionId: asCompetitionId(competitionId),
      organizationId: asOrganizationId("another-organization"),
      formulaVersion: COMPETITION_STANDING_FORMULA_VERSION,
      rows: [
        {
          position: 1,
          teamId: asTeamId("foreign-team"),
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          goalsFor: 1,
          goalsAgainst: 0,
          goalDifference: 1,
          points: 3,
          form: ["win"],
        },
      ],
      sourceRevisionMax: 1,
      updatedAt: new Date("2026-09-08T20:00:00.000Z"),
    });

    const response = await anonymous(`/${competitionId}/standings`);

    expect(await response.json()).toEqual({
      standings: { rows: [], swiss: null, updatedAt: null },
    });
  });

  it("answers 404 when the competition is shown under another or an unknown organization", async () => {
    const { app, modules, slug, competitionId } = await setup({ publish: true });
    await modules.organizations.repositories.organizations.create({
      id: asOrganizationId("organization-other"),
      name: "Otra Liga",
      normalizedName: "otra liga",
      slug: parseOrganizationSlug("otra-liga")!,
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      createdByActorId: asActorId(ORGANIZER),
    });

    const own = await app.request(
      `/api/v1/public/organizations/${slug}/competitions/${competitionId}`,
    );
    expect(own.status).toBe(200);
    for (const organizationSlug of ["otra-liga", "no-such-organization"]) {
      for (const suffix of PUBLIC_SUFFIXES) {
        const response = await app.request(
          `/api/v1/public/organizations/${organizationSlug}/competitions/${competitionId}${suffix}`,
        );
        expect({ organizationSlug, suffix, status: response.status }).toEqual({
          organizationSlug,
          suffix,
          status: 404,
        });
        expect(await response.text()).not.toContain("Copa Barranco");
      }
    }
  });

  it("lists approved teams by name and the public rules without workflow settings", async () => {
    const { anonymous, competitionId } = await setup({ publish: true });

    const teams = await anonymous(`/${competitionId}/teams`);
    expect(teams.status).toBe(200);
    await expectMatchesOpenApi(teams, "get", `${PUBLIC_PATH}/teams`);
    expect(teams.headers.get("cache-control")).toBe(PUBLIC_READ_CACHE_CONTROL);
    expect(await parseResponse(getPublicTeamsResponseSchema, teams)).toEqual({
      teams: [{ name: "Barranco FC" }, { name: "Miraflores CF" }, { name: "Surquillo United" }],
    });

    const response = await anonymous(`/${competitionId}/rules`);
    expect(response.status).toBe(200);
    await expectMatchesOpenApi(response, "get", `${PUBLIC_PATH}/rules`);
    const raw = await response.clone().text();
    expect(await parseResponse(getPublicRulesResponseSchema, response)).toEqual({
      rules: {
        format: "league",
        teams: expect.objectContaining({ min: expect.any(Number) }),
        stages: [
          {
            stage: "regular",
            winPoints: 3,
            drawPoints: 1,
            lossPoints: 0,
            officialMatchesPerEncounter: 1,
            resolutionMode: "independent_matches",
            rescheduling: { allowed: true, maxPerTeam: 2, minimumNoticeHours: 12 },
          },
        ],
        maxRosterSize: 16,
      },
    });
    for (const secret of ["rescheduleRequires", "rescheduleProposalExpiryHours", "version"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("answers no bracket for a league and draws a knockout by team names", async () => {
    const league = await setup({ publish: true });
    const none = await league.anonymous(`/${league.competitionId}/bracket`);
    expect(none.status).toBe(200);
    await expectMatchesOpenApi(none, "get", `${PUBLIC_PATH}/bracket`);
    expect(await none.json()).toEqual({ bracket: null });

    const knockout = await setup({ publish: true, format: "knockout" });
    const response = await knockout.anonymous(`/${knockout.competitionId}/bracket`);
    expect(response.status).toBe(200);
    await expectMatchesOpenApi(response, "get", `${PUBLIC_PATH}/bracket`);
    const raw = await response.clone().text();
    const body = await parseResponse(getPublicBracketResponseSchema, response);
    const sides = (body.bracket?.stages ?? [])
      .flatMap((stage) => stage.rounds)
      .flatMap((round) => round.encounters)
      .flatMap((encounter) => [encounter.home, encounter.away]);
    expect(
      sides
        .filter((side) => side.kind === "team")
        .map((side) => side.name)
        .sort(),
    ).toEqual(expect.arrayContaining(["Barranco FC"]));
    const plans = await knockout.modules.scheduling.fixturePlans.listActive(
      asOrganizationId(knockout.organizationId),
      asCompetitionId(knockout.competitionId),
    );
    const encounterIds = plans
      .flatMap((plan) => plan.stages)
      .flatMap((stage) => stage.rounds)
      .flatMap((round) => [round.id, ...round.encounters.map((encounter) => encounter.id)]);
    for (const secret of [
      ...encounterIds,
      plans[0]?.id ?? "missing-plan",
      knockout.organizationId,
      knockout.competitionId,
      "teamId",
      "encounterId",
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("names ranked players by their roster game account, never by profile id", async () => {
    const { anonymous, modules, organizationId, competitionId } = await setup({ publish: true });
    const empty = await anonymous(`/${competitionId}/rankings/scorer`);
    expect(empty.status).toBe(200);
    await expectMatchesOpenApi(empty, "get", `${PUBLIC_PATH}/rankings/{kind}`);
    expect(await empty.json()).toEqual({
      ranking: { kind: "scorer", rows: [], updatedAt: null },
    });

    const plans = await modules.scheduling.fixturePlans.listActive(
      asOrganizationId(organizationId),
      asCompetitionId(competitionId),
    );
    const encounter = plans[0]?.stages[0]?.rounds[0]?.encounters[0];
    const teamId = encounter?.home.kind === "team" ? encounter.home.teamId : null;
    if (!teamId) throw new Error("fixture without a team");
    await modules.teams.repositories.accounts.saveIfAbsent({
      id: "game-account-secret-id",
      playerProfileId: "player-profile-secret",
      identifier: "AnaGol_10",
      normalizedIdentifier: "anagol_10",
      providerExternalPlayerId: "ea-provider-player-secret",
      platform: "playstation",
      gameEdition: "fc26",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    await modules.teams.repositories.rosters.add({
      id: "roster-membership-secret",
      organizationId: asOrganizationId(organizationId),
      competitionId: asCompetitionId(competitionId),
      teamId,
      playerProfileId: "player-profile-secret",
      gameAccountId: "game-account-secret-id",
      role: "player",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    await modules.statistics.ports.rankings.replaceForCompetition(asCompetitionId(competitionId), [
      {
        competitionId: asCompetitionId(competitionId),
        organizationId: asOrganizationId(organizationId),
        kind: "scorer",
        formulaVersion: RANKING_FORMULA_VERSION,
        eligibility: { minimumMatches: 1, minimumTeamMinutesRatio: 0 },
        rows: [
          {
            position: 1,
            playerProfileId: "player-profile-secret",
            teamId,
            value: 4,
            matchesPlayed: 2,
            minutes: 180,
          },
          {
            position: 2,
            playerProfileId: "player-without-roster",
            teamId,
            value: 1,
            matchesPlayed: 2,
            minutes: 180,
          },
        ],
        sourceRevisionMax: 7,
        updatedAt: new Date("2026-09-08T20:00:00.000Z"),
      },
    ]);

    const response = await anonymous(`/${competitionId}/rankings/scorer`);
    const raw = await response.clone().text();
    const body = await parseResponse(getPublicRankingResponseSchema, response);
    expect(body.ranking.updatedAt).toBe("2026-09-08T20:00:00.000Z");
    expect(body.ranking.rows).toEqual([
      {
        position: 1,
        playerName: "AnaGol_10",
        teamName: expect.any(String),
        value: 4,
        matchesPlayed: 2,
      },
    ]);
    for (const secret of [
      "player-profile-secret",
      "player-without-roster",
      "game-account-secret-id",
      "ea-provider-player-secret",
      "roster-membership-secret",
      teamId,
      "formulaVersion",
      "sourceRevisionMax",
      "minutes",
    ]) {
      expect(raw).not.toContain(secret);
    }

    const unknownKind = await anonymous(`/${competitionId}/rankings/owngoals`);
    expect(unknownKind.status).toBe(400);
  });

  it("keeps the private statistics and competition routes behind service auth", async () => {
    const { app, organizationId, competitionId } = await setup({ publish: true });
    const base = `/api/v1/organizations/${organizationId}/competitions/${competitionId}`;

    for (const path of [
      `${base}/standings`,
      `${base}/rankings`,
      `${base}/team-statistics`,
      `${base}/team-performance-ranking`,
      `${base}/participants`,
      base,
      "/api/v1/competitions/explore",
      `/api/v1/competitions/explore/${competitionId}`,
    ]) {
      const response = await app.request(path);
      expect({ path, status: response.status }).toEqual({ path, status: 401 });
    }
  });

  it("does not turn the public router into a way around authorization on private paths", async () => {
    const { app, slug, organizationId, competitionId } = await setup({ publish: true });

    // A stranger with valid service auth is still refused the private table.
    const outsider = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/standings`,
      { headers: serviceHeaders("actor-outsider") },
    );
    expect(outsider.status).toBe(403);

    // Credentials are ignored, not required, on public paths.
    const withCredentials = await app.request(
      `/api/v1/public/organizations/${slug}/competitions/${competitionId}`,
      { headers: serviceHeaders("actor-outsider") },
    );
    expect(withCredentials.status).toBe(200);
  });
});
