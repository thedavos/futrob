import { err, ok, type OrganizationId, type Result } from "@futrob/shared-kernel";
import type { Competition } from "../domain/entities/competition.ts";
import {
  InvalidCompetitionCover,
  InvalidCompetitionSchedule,
  InvalidCompetitionTeamRange,
  type CompetitionProfileError,
} from "../domain/errors/competition.errors.ts";
import {
  parseCompetitionCover,
  type CompetitionCoverInput,
} from "../domain/value-objects/competition-cover.ts";
import { parseSchedule } from "../domain/value-objects/competition-schedule.ts";
import { parseTeamRange } from "../domain/value-objects/team-range.ts";

export type CompetitionProfile = Pick<Competition, "teams" | "schedule" | "cover">;

/** Omitted parts keep `current`; create passes the defaults as `current`. */
export interface CompetitionProfileInput {
  readonly teams?: { readonly min: number; readonly max: number | null };
  readonly schedule?: { readonly startsOn: string | null; readonly endsOn: string | null };
  readonly cover?: CompetitionCoverInput;
}

export function resolveCompetitionProfile(
  current: CompetitionProfile,
  input: CompetitionProfileInput,
  organizationId: OrganizationId,
): Result<CompetitionProfile, CompetitionProfileError> {
  const teams = input.teams === undefined ? current.teams : parseTeamRange(input.teams);
  if (!teams)
    return err(
      new InvalidCompetitionTeamRange({
        code: "competitions.invalid_team_range",
        message: "Teams need 2 ≤ min ≤ max ≤ 256",
      }),
    );
  const schedule = input.schedule === undefined ? current.schedule : parseSchedule(input.schedule);
  if (!schedule)
    return err(
      new InvalidCompetitionSchedule({
        code: "competitions.invalid_schedule",
        message: "Dates must be real YYYY-MM-DD days and the end cannot precede the start",
      }),
    );
  const cover =
    input.cover === undefined ? current.cover : parseCompetitionCover(input.cover, organizationId);
  if (!cover)
    return err(
      new InvalidCompetitionCover({
        code: "competitions.invalid_cover",
        message: "Cover must be a preset or an upload owned by this organization",
      }),
    );
  return ok({ teams, schedule, cover });
}
