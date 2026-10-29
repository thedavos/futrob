/** Public API for public-portal: sanitized, anonymous reads of published competitions. */
export {
  asPublicCompetitionKey,
  type PublicCompetitionKey,
} from "./domain/public-competition-key.ts";
export {
  PUBLIC_COMPETITION_STATUSES,
  isPubliclyVisibleStatus,
  type PublicCompetitionStatus,
} from "./domain/policies/public-visibility.ts";
export {
  PublicCompetitionNotFound,
  type PublicPortalReadError,
} from "./domain/errors/public-portal.errors.ts";
export type {
  PublicCalendar,
  PublicCalendarEntry,
  PublicCompetition,
  PublicEncounterStatus,
  PublicStandingRow,
  PublicStandings,
} from "./domain/entities/public-competition.ts";
export type {
  PublicCompetitionScope,
  PublicCompetitionSource,
  PublishedCompetitionReaderPort,
} from "./domain/ports/published-competition-reader.port.ts";
export type {
  PublicStandingsReaderPort,
  PublicStandingsSource,
  PublicStandingsSourceRow,
} from "./domain/ports/public-standings-reader.port.ts";
export type {
  PublicCalendarReaderPort,
  PublicCalendarSourceEntry,
} from "./domain/ports/public-calendar-reader.port.ts";
export type { PublicTeamDirectoryPort } from "./domain/ports/public-team-directory.port.ts";
export { GetPublicCompetitionUseCase } from "./application/get-public-competition/get-public-competition.use-case.ts";
export {
  GetPublicStandingsUseCase,
  type GetPublicStandingsDependencies,
} from "./application/get-public-standings/get-public-standings.use-case.ts";
export {
  GetPublicCalendarUseCase,
  type GetPublicCalendarDependencies,
} from "./application/get-public-calendar/get-public-calendar.use-case.ts";
