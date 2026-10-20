import type {
  EncounterViewDto,
  ListCompetitionEncountersResponse,
  GetMyNextEncounterResponse,
  NextEncounterDto,
} from "@futrob/api-contracts";
import type { EncounterView } from "@/application/scheduling/get-encounter-view.use-case.ts";
import type { CompetitionEncounters } from "@/application/scheduling/list-competition-encounters.use-case.ts";
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

export function encounterViewDto(view: EncounterView): EncounterViewDto {
  return {
    ...nextEncounterDto(view),
    resolutionMode: view.resolutionMode,
    officialMatches: view.officialMatches.map((match) => ({
      officialSlot: match.slot,
      scheduledStartAt: match.scheduledStartAt.toISOString(),
    })),
  };
}

export function competitionEncountersDto(
  list: CompetitionEncounters,
): ListCompetitionEncountersResponse {
  return {
    competition: list.competition,
    encounters: list.encounters.map((encounter) => ({
      ...encounter,
      scheduledStartAt: encounter.scheduledStartAt.toISOString(),
    })),
  };
}
