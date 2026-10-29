import { compareTime, err, ok, type ClockPort, type Result } from "@futrob/shared-kernel";
import type {
  PublicCalendar,
  PublicCalendarEntry,
  PublicEncounterStatus,
} from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type { PublicCalendarReaderPort } from "../../domain/ports/public-calendar-reader.port.ts";
import type { PublicTeamDirectoryPort } from "../../domain/ports/public-team-directory.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";

export interface GetPublicCalendarDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly calendar: PublicCalendarReaderPort;
  readonly teams: PublicTeamDirectoryPort;
  readonly clock: ClockPort;
}

export class GetPublicCalendarUseCase {
  constructor(private readonly deps: GetPublicCalendarDependencies) {}

  /**
   * Encounters of a published competition with both teams known, earliest first. Results,
   * candidates and fixture internals are not part of the calendar.
   */
  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicCalendar, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const { scope, timeZone } = resolved.value;

    const source = await this.deps.calendar.list(scope);
    const names = await this.deps.teams.namesByIds(
      scope,
      source.flatMap((entry) => [entry.homeTeamId, entry.awayTeamId]),
    );
    const now = this.deps.clock.now();

    const entries = source.flatMap((entry): PublicCalendarEntry[] => {
      const homeTeamName = names.get(entry.homeTeamId);
      const awayTeamName = names.get(entry.awayTeamId);
      if (homeTeamName === undefined || awayTeamName === undefined) return [];
      const status: PublicEncounterStatus = entry.official
        ? "official"
        : entry.scheduledStartAt.getTime() <= now.getTime()
          ? "awaiting_result"
          : "scheduled";
      return [
        {
          roundNumber: entry.roundNumber,
          scheduledStartAt: entry.scheduledStartAt,
          homeTeamName,
          awayTeamName,
          status,
        },
      ];
    });

    return ok({
      timeZone,
      entries: entries.sort(
        (a, b) =>
          compareTime(a.scheduledStartAt, b.scheduledStartAt) || a.roundNumber - b.roundNumber,
      ),
    });
  }
}
