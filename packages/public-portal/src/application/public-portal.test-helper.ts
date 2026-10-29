import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  parseCalendarDate,
  parseCompetitionCover,
  type CompetitionStatus,
} from "@futrob/competitions";
import { asPublicCompetitionKey } from "../domain/public-competition-key.ts";
import type {
  PublicCompetitionScope,
  PublicCompetitionSource,
  PublishedCompetitionReaderPort,
} from "../domain/ports/published-competition-reader.port.ts";
import type { PublicStandingsReaderPort } from "../domain/ports/public-standings-reader.port.ts";
import type { PublicCalendarReaderPort } from "../domain/ports/public-calendar-reader.port.ts";
import type { PublicTeamDirectoryPort } from "../domain/ports/public-team-directory.port.ts";

/** Deliberately unlike the internal id: the key is opaque and use cases must not assume more. */
export const PUBLIC_KEY = asPublicCompetitionKey("copa-barranco");
export const COMPETITION_ID = asCompetitionId("competition-internal-1");
export const ORGANIZATION_ID = asOrganizationId("organization-internal-1");
export const UPLOAD_KEY = `competition-covers/${ORGANIZATION_ID}/portada.png`;

export const SCOPE: PublicCompetitionScope = {
  competitionId: COMPETITION_ID,
  organizationId: ORGANIZATION_ID,
};

export const BARRANCO = asTeamId("team-internal-barranco");
export const SURQUILLO = asTeamId("team-internal-surquillo");
export const MIRAFLORES = asTeamId("team-internal-miraflores");

export function competitionSource(
  overrides: Partial<PublicCompetitionSource> = {},
): PublicCompetitionSource {
  return {
    scope: SCOPE,
    name: "Copa Barranco",
    status: "published",
    format: "league",
    platform: "playstation",
    gameEdition: "fc26",
    region: "south-america",
    timeZone: "America/Lima",
    startsOn: parseCalendarDate("2026-11-01"),
    endsOn: null,
    cover: parseCompetitionCover({ kind: "upload", key: UPLOAD_KEY }, ORGANIZATION_ID) ?? {
      kind: "preset",
      preset: "cup",
    },
    approvedTeamCount: 2,
    ...overrides,
  };
}

export function publishedReader(
  source: PublicCompetitionSource | null,
): PublishedCompetitionReaderPort & { readonly requested: string[] } {
  const requested: string[] = [];
  return {
    requested,
    async findByKey(key) {
      requested.push(key);
      return key === PUBLIC_KEY ? source : null;
    },
  };
}

export function sourceWithStatus(status: CompetitionStatus): PublicCompetitionSource {
  return competitionSource({ status });
}

export function teamDirectory(
  names: ReadonlyMap<TeamId, string>,
): PublicTeamDirectoryPort & { readonly calls: number } {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async namesByIds(_scope, ids) {
      state.calls += 1;
      return new Map(
        ids.flatMap((id) => (names.has(id) ? [[id, names.get(id) ?? ""] as const] : [])),
      );
    },
  };
}

export const TEAM_NAMES: ReadonlyMap<TeamId, string> = new Map([
  [BARRANCO, "Barranco FC"],
  [SURQUILLO, "Surquillo United"],
  [MIRAFLORES, "Miraflores CF"],
]);

export function countingStandings(
  read: PublicStandingsReaderPort["read"],
): PublicStandingsReaderPort & { readonly calls: CompetitionId[] } {
  const calls: CompetitionId[] = [];
  return {
    calls,
    async read(scope) {
      calls.push(scope.competitionId);
      return read(scope);
    },
  };
}

export function countingCalendar(
  list: PublicCalendarReaderPort["list"],
): PublicCalendarReaderPort & { readonly calls: CompetitionId[] } {
  const calls: CompetitionId[] = [];
  return {
    calls,
    async list(scope) {
      calls.push(scope.competitionId);
      return list(scope);
    },
  };
}
