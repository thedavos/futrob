import type { Competition, CompetitionDraft } from "@futrob/competitions";
import type { CompetitionDraftDto, CompetitionDto } from "@futrob/api-contracts";

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
    createdAt: competition.createdAt.toISOString(),
    updatedAt: competition.updatedAt.toISOString(),
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
