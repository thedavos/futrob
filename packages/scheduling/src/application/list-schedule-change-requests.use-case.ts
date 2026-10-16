import { err, ok, type ActorId, type EncounterId, type Result } from "@futrob/shared-kernel";
import { ScheduleChangeRequestNotFound } from "../domain/errors/schedule-change-request.errors.ts";
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import { officialMatchSchedules } from "../domain/policies/official-match-schedule.ts";
import {
  creatableRescheduleScopes,
  scheduleChangeCreationOptions,
  scheduleChangeRequestCapabilities,
  type ScheduleChangeCreationOptions,
} from "../domain/policies/schedule-change-capabilities.ts";
import type { ScheduleChangeRequestView } from "./get-schedule-change-request.use-case.ts";
import {
  readScheduleChangeAuthority,
  readScheduleChangeFacts,
  type ScheduleChangeCapabilityDeps,
} from "./read-schedule-change-capabilities.ts";

export interface ListScheduleChangeRequestsInput {
  readonly actorId: ActorId;
  readonly encounterId: EncounterId;
}

export interface ListScheduleChangeRequestsOutput {
  readonly requests: readonly ScheduleChangeRequestView[];
  /** What a new request by this actor may name. */
  readonly creation: ScheduleChangeCreationOptions;
}

export type ListScheduleChangeRequestsError = ScheduleChangeRequestNotFound;

export class ListScheduleChangeRequestsUseCase {
  constructor(
    private readonly deps: ScheduleChangeCapabilityDeps & {
      readonly encounters: Pick<EncounterScheduleRepository, "findById">;
      readonly matches: Pick<OfficialMatchRepository, "listByEncounter">;
      readonly requests: Pick<
        ScheduleChangeRequestRepository,
        "listByEncounter" | "listActiveByEncounter"
      >;
      readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules" | "countAppliedReschedules">;
    },
  ) {}

  async execute(
    input: ListScheduleChangeRequestsInput,
  ): Promise<Result<ListScheduleChangeRequestsOutput, ListScheduleChangeRequestsError>> {
    const encounter = await this.deps.encounters.findById(input.encounterId);
    if (!encounter) {
      return err(encounterNotFound(input.encounterId));
    }

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.read,
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(encounterNotFound(input.encounterId));
    }

    const [requests, activeRequests, matches, authority] = await Promise.all([
      this.deps.requests.listByEncounter(encounter.organizationId, encounter.encounterId),
      this.deps.requests.listActiveByEncounter(encounter.organizationId, encounter.encounterId),
      this.deps.matches.listByEncounter(encounter.encounterId),
      readScheduleChangeAuthority(this.deps.authorization, input.actorId, encounter),
    ]);
    const [facts, appliedReschedules] = await Promise.all([
      readScheduleChangeFacts(this.deps, encounter, [
        ...creatableRescheduleScopes(encounter.officialMatchCount),
        ...requests.map((request) => request.scope),
      ]),
      Promise.all(
        authority.teamIds.map(
          async (teamId) =>
            [
              teamId,
              await this.deps.rules.countAppliedReschedules({
                organizationId: encounter.organizationId,
                competitionId: encounter.competitionId,
                encounterId: encounter.encounterId,
                teamId,
              }),
            ] as const,
        ),
      ),
    ]);

    return ok({
      requests: requests.map((request) => ({
        request,
        capabilities: scheduleChangeRequestCapabilities(request, authority, facts),
      })),
      creation: scheduleChangeCreationOptions({
        authority,
        facts,
        officialMatchCount: encounter.officialMatchCount,
        schedules: officialMatchSchedules(encounter, matches),
        activeRequests,
        appliedReschedules: new Map(appliedReschedules),
      }),
    });
  }
}

function encounterNotFound(encounterId: EncounterId): ScheduleChangeRequestNotFound {
  return new ScheduleChangeRequestNotFound({
    code: "scheduling.schedule_change_encounter_not_found",
    message: "Encounter not found",
    encounterId,
  });
}
