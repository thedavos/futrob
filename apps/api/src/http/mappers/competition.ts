import type { CompetitionDraft } from "@futrob/competitions";
import type { CompetitionDraftDto } from "@futrob/api-contracts";

export function competitionDraftDto(draft: CompetitionDraft): CompetitionDraftDto {
  return {
    competition: {
      id: draft.competition.id,
      organizationId: draft.competition.organizationId,
      name: draft.competition.name,
      status: draft.competition.status,
      modality: draft.competition.modality,
      gameEdition: draft.competition.gameEdition,
      platform: draft.competition.platform,
      region: draft.competition.region,
      timeZone: draft.competition.timeZone,
      format: draft.competition.format,
      createdAt: draft.competition.createdAt.toISOString(),
      updatedAt: draft.competition.updatedAt.toISOString(),
    },
    rules: {
      version: draft.rules.version,
      regularStage: draft.rules.regularStage,
      knockoutStage: draft.rules.knockoutStage,
      awayGoalsEnabled: draft.rules.awayGoalsEnabled,
      maxRosterSize: draft.rules.maxRosterSize,
      requireVerifiedExternalClub: draft.rules.requireVerifiedExternalClub,
      createdAt: draft.rules.createdAt.toISOString(),
    },
  };
}
