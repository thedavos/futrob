import type { Competition, CompetitionDraft } from "@futrob/competitions";
import type {
  CompetitionDraftDto,
  CompetitionDto,
  ExploreCompetitionDto,
} from "@futrob/api-contracts";
import type { ExploreCompetitionItem } from "@/application/discovery/explore-competitions.query.ts";

export function competitionDto(competition: Competition): CompetitionDto {
  return {
    id: competition.id,
    organizationId: competition.organizationId,
    name: competition.name,
    status: competition.status,
    modality: competition.modality,
    gameEdition: competition.gameEdition,
    platform: competition.platform,
    region: competition.region,
    timeZone: competition.timeZone,
    format: competition.format,
    teams: competition.teams,
    schedule: competition.schedule,
    cover: competition.cover,
    createdAt: competition.createdAt.toISOString(),
    updatedAt: competition.updatedAt.toISOString(),
  };
}

export function exploreCompetitionDto(item: ExploreCompetitionItem): ExploreCompetitionDto {
  return {
    competition: competitionDto(item.competition),
    organization: item.organization,
    approvedTeamCount: item.approvedTeamCount,
  };
}

export function competitionDraftDto(draft: CompetitionDraft): CompetitionDraftDto {
  return {
    competition: competitionDto(draft.competition),
    rules: {
      version: draft.rules.version,
      regularStage: draft.rules.regularStage,
      knockoutStage: draft.rules.knockoutStage,
      awayGoalsEnabled: draft.rules.awayGoalsEnabled,
      maxRosterSize: draft.rules.maxRosterSize,
      createdAt: draft.rules.createdAt.toISOString(),
    },
  };
}
