import type { CompetitionApplication } from "@/application/competitions/competition-application.flow.ts";
import type { CompetitionEntryDto } from "@futrob/api-contracts";
import type { CompetitionEntry } from "@futrob/competitions";

export function competitionEntryDto(entry: CompetitionEntry): CompetitionEntryDto {
  return {
    id: entry.id,
    organizationId: entry.organizationId,
    competitionId: entry.competitionId,
    teamId: entry.teamId,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function competitionApplicationDto(application: CompetitionApplication) {
  return {
    entryId: application.entry.id,
    status: application.entry.status,
    teamId: application.team.id,
    teamName: application.team.name,
    createdAt: application.entry.createdAt.toISOString(),
  };
}
