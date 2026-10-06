import type { ProviderMatch, ProviderMatchRepository } from "@futrob/game-data";
import { parseOrganizationSlug } from "@futrob/organizations";
import { asFixtureStageId } from "@futrob/scheduling";
import {
  type ClockPort,
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { vi } from "vite-plus/test";
import { stubFetch } from "@/http/http-app.harness.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { createModules } from "./create-modules.ts";

export const NOW = new Date("2026-09-14T21:00:00.000Z");
export const ORG = asOrganizationId("org-selection");
export const COMPETITION = asCompetitionId("comp-selection");
export const ENCOUNTER = asEncounterId("enc-selection");
export const SECOND_ENCOUNTER = asEncounterId("enc-selection-2");
export const HOME = asTeamId("team-home");
export const AWAY = asTeamId("team-away");
export const OPERATOR = asActorId("actor-operator");
export const HOME_CAPTAIN = asActorId("actor-home-captain");
export const AWAY_CAPTAIN = asActorId("actor-away-captain");
export const AWAY_PLAYER = asActorId("actor-away-player");
export const STAFF = asActorId("actor-staff-nogrant");

export function providerMatch(externalMatchId: string): ProviderMatch {
  return {
    id: `id-${externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date("2026-09-14T20:00:00.000Z"),
    home: { externalClubId: "club-home", name: "Home", goals: 2, imageUrl: null },
    away: { externalClubId: "club-away", name: "Away", goals: 1, imageUrl: null },
    players: [],
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

/** `pool` makes every store Postgres-backed; `matches` is the observation repository to seed. */
export async function seedComposition(backend: {
  readonly pool: Pool | undefined;
  readonly matches: ProviderMatchRepository;
  readonly clock?: ClockPort;
  readonly resultsSystemActorId?: string;
}) {
  if (backend.pool) {
    await seedActors(backend.pool, OPERATOR, HOME_CAPTAIN, AWAY_CAPTAIN, AWAY_PLAYER, STAFF);
  }
  await backend.matches.upsertMany([providerMatch("m-1"), providerMatch("m-2")]);
  const modules = createModules({
    fetcher: stubFetch,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: backend.pool,
    providerMatches: backend.matches,
    clock: backend.clock,
    resultsSystemActorId: backend.resultsSystemActorId,
  });

  await modules.organizations.repositories.organizations.create({
    id: ORG,
    name: "Org",
    normalizedName: "org",
    slug: parseOrganizationSlug("org-selection")!,
    timeZone: "America/Lima",
    logo: { kind: "monogram" },
    createdAt: NOW,
    createdByActorId: OPERATOR,
  });
  await modules.competitions.repository.saveDraft({
    competition: {
      id: COMPETITION,
      organizationId: ORG,
      name: "Copa",
      status: "draft",
      modality: "fc-clubs",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: OPERATOR,
      createdAt: NOW,
      updatedAt: NOW,
    },
    rules: {
      competitionId: COMPETITION,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      createdAt: NOW,
    },
  });
  for (const [teamId, name] of [
    [HOME, "Home"],
    [AWAY, "Away"],
  ] as const) {
    await modules.teams.repositories.teams.save({
      id: teamId,
      organizationId: ORG,
      name,
      createdAt: NOW,
      createdByActorId: OPERATOR,
      creationKey: null,
    });
    await modules.competitions.entryRepository.save({
      id: `entry-${teamId}`,
      organizationId: ORG,
      competitionId: COMPETITION,
      teamId,
      status: "approved",
      createdAt: NOW,
      creationKey: null,
    });
    await modules.teams.externalClubConnections.upsert({
      teamId,
      providerKey: "ea-clubs",
      externalClubId: teamId === HOME ? "club-home" : "club-away",
      externalClubName: name,
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
  }
  for (const [actorId, teamId, role] of [
    [HOME_CAPTAIN, HOME, "captain"],
    [AWAY_CAPTAIN, AWAY, "captain"],
    [AWAY_PLAYER, AWAY, "player"],
  ] as const) {
    const profile = await modules.teams.repositories.profiles.saveIfAbsent({
      id: `profile-${actorId}`,
      actorId,
      createdAt: NOW,
    });
    await modules.teams.repositories.rosters.add({
      id: `roster-${actorId}`,
      organizationId: ORG,
      competitionId: COMPETITION,
      teamId,
      playerProfileId: profile.id,
      gameAccountId: null,
      role,
      createdAt: NOW,
    });
  }
  await modules.authorization.bootstrapInitialSuperuser(OPERATOR);
  await modules.scheduling.encounters.upsert({
    encounterId: ENCOUNTER,
    organizationId: ORG,
    competitionId: COMPETITION,
    homeTeamId: HOME,
    awayTeamId: AWAY,
    scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
    officialMatchCount: 1,
    stageId: asFixtureStageId("stage-1"),
  });
  await modules.scheduling.encounters.upsert({
    encounterId: SECOND_ENCOUNTER,
    organizationId: ORG,
    competitionId: COMPETITION,
    homeTeamId: HOME,
    awayTeamId: AWAY,
    scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
    officialMatchCount: 1,
    stageId: asFixtureStageId("stage-2"),
  });
  for (const encounterId of [ENCOUNTER, SECOND_ENCOUNTER]) {
    await modules.results.associateEncounterCandidates.execute({
      organizationId: ORG,
      encounterId,
    });
  }
  const project = vi.spyOn(modules.statistics.useCases.projectOfficialResult, "execute");
  return { modules, project };
}

export const slot = (externalId: string) => [
  { officialSlot: 1 as const, providerMatchRef: { providerKey: "ea-clubs" as const, externalId } },
];
