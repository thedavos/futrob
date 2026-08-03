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
