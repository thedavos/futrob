import type { CompetitionDto, CompetitionStatusDto, TeamDto } from "@futrob/api-contracts";
import { compareByTime, TIME_SORT_DIRECTION } from "@futrob/shared-kernel";

/** Operational competitions. Drafts are a separate count; finished and archived are not active. */
const ACTIVE_STATUSES = new Set<CompetitionStatusDto>(["registration", "published", "paused"]);

export const ORGANIZATION_HOME_LIST_LIMIT = 5;
export const ORGANIZATION_HOME_ACTIVITY_LIMIT = 6;

export function countActiveCompetitions(competitions: readonly CompetitionDto[]): number {
  return competitions.filter((competition) => ACTIVE_STATUSES.has(competition.status)).length;
}

export function countDraftCompetitions(competitions: readonly CompetitionDto[]): number {
  return competitions.filter((competition) => competition.status === "draft").length;
}

export type OrganizationHomeActivity =
  | {
      readonly kind: "competition";
      readonly id: string;
      readonly name: string;
      readonly status: CompetitionStatusDto;
      readonly at: string;
    }
  | {
      readonly kind: "team";
      readonly id: string;
      readonly name: string;
      readonly at: string;
    };

export function recentOrganizationCompetitions(
  competitions: readonly CompetitionDto[],
  limit = ORGANIZATION_HOME_LIST_LIMIT,
): readonly CompetitionDto[] {
  return [...competitions]
    .sort(compareByTime((competition) => new Date(competition.updatedAt), TIME_SORT_DIRECTION.desc))
    .slice(0, limit);
}

/** Competitions use `updatedAt`; teams use `createdAt`. There is no activity log to attribute an actor. */
export function recentOrganizationActivity(
  competitions: readonly CompetitionDto[],
  teams: readonly TeamDto[],
  limit = ORGANIZATION_HOME_ACTIVITY_LIMIT,
): readonly OrganizationHomeActivity[] {
  const items: OrganizationHomeActivity[] = [
    ...competitions.map((competition) => ({
      kind: "competition" as const,
      id: competition.id,
      name: competition.name,
      status: competition.status,
      at: competition.updatedAt,
    })),
    ...teams.map((team) => ({
      kind: "team" as const,
      id: team.id,
      name: team.name,
      at: team.createdAt,
    })),
  ];
  return [...items]
    .sort(compareByTime((item) => new Date(item.at), TIME_SORT_DIRECTION.desc))
    .slice(0, limit);
}
