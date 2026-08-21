import type { TeamAggregateStats } from "../entities/team-aggregate-stats.ts";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import { aggregateStatContributions } from "./aggregate-contribution-stats.ts";

export function aggregateTeamContributions(
  contributions: readonly TeamMatchContribution[],
): TeamAggregateStats {
  return aggregateStatContributions(contributions);
}
