import {
  completeOrganizationOnboardingResponseSchema,
  fixturePlanSchema,
  type FixtureEncounterDto,
} from "@futrob/api-contracts";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

export const LEAGUE_ORGANIZER = "actor-contract-organizer";

export async function publishLeagueWithFixture() {
  const modules = createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
  });
  const app = createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
    correlationLogger: { info: () => undefined, error: () => undefined },
  });
  const created = await app.request("/api/v1/identity/onboarding/organization", {
    method: "POST",
    headers: serviceHeaders(LEAGUE_ORGANIZER),
    body: JSON.stringify({
      name: "Contract Org",
      competition: onboardingCompetition,
      gameAccount: null,
    }),
  });
  const createdBody = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
  const { organizationId } = createdBody;
  const competitionId = createdBody.competition.competition.id;
  for (const [name, creationKey] of [
    ["Alpha Contract", "contract-alpha"],
    ["Beta Contract", "contract-beta"],
    ["Gamma Contract", "contract-gamma"],
  ] as const) {
    const added = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(LEAGUE_ORGANIZER),
        body: JSON.stringify({ kind: "new-team", name, creationKey }),
      },
    );
    if (added.status >= 300) {
      throw new Error(`Failed to add participant ${name}: ${added.status}`);
    }
  }
  const published = await app.request(
    `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
    { method: "POST", headers: serviceHeaders(LEAGUE_ORGANIZER) },
  );
  if (published.status >= 300) {
    throw new Error(`Failed to publish competition: ${published.status}`);
  }
  const generated = await app.request(
    `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixture`,
    {
      method: "POST",
      headers: serviceHeaders(LEAGUE_ORGANIZER),
      body: JSON.stringify({
        generationVersion: 1,
        startsAt: "2026-09-01T01:00:00.000Z",
        roundIntervalDays: 7,
        homeAndAway: false,
      }),
    },
  );
  if (generated.status !== 200) {
    throw new Error(`Failed to generate fixture: ${generated.status}`);
  }
  const fixture = await parseResponse(fixturePlanSchema, generated);
  const encounter = fixture.stages[0]?.rounds[0]?.encounters.find(
    (row) => row.home.kind === "team" && row.away.kind === "team",
  );
  if (!encounter) throw new Error("Expected a Team vs Team Encounter");
  return { app, modules, organizationId, competitionId, encounter, fixture };
}

export function fixtureTeamId(slot: FixtureEncounterDto["home"]): string {
  if (slot.kind !== "team") throw new Error("Expected a Team participant");
  return slot.teamId;
}
