import type { GetMyNextEncounterResponse, NextEncounterDto } from "@futrob/api-contracts";
import type { MyNextEncounter } from "@/application/scheduling/get-my-next-encounter.use-case.ts";

export function nextEncounterDto(encounter: MyNextEncounter): NextEncounterDto {
  return {
    encounterId: encounter.encounterId,
    competition: encounter.competition,
    round: encounter.round,
    scheduledStartAt: encounter.scheduledStartAt.toISOString(),
    officialMatchCount: encounter.officialMatchCount,
    home: encounter.home,
    away: encounter.away,
  };
}

export function getMyNextEncounterResponse(
  encounter: MyNextEncounter | null,
): GetMyNextEncounterResponse {
  return { encounter: encounter ? nextEncounterDto(encounter) : null };
}
