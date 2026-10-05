import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type EncounterId,
  type Result,
} from "@futrob/shared-kernel";
import type { ScheduleChangeRequest } from "../domain/entities/schedule-change-request.ts";
import { ScheduleChangeRequestNotFound } from "../domain/errors/schedule-change-request.errors.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

export interface ListScheduleChangeRequestsInput {
  readonly actorId: ActorId;
  readonly encounterId: EncounterId;
}

export type ListScheduleChangeRequestsError = ScheduleChangeRequestNotFound;

export class ListScheduleChangeRequestsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly encounters: EncounterScheduleRepository;
      readonly requests: Pick<ScheduleChangeRequestRepository, "listByEncounter">;
    },
  ) {}

  async execute(
    input: ListScheduleChangeRequestsInput,
  ): Promise<Result<readonly ScheduleChangeRequest[], ListScheduleChangeRequestsError>> {
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

    return ok(
      await this.deps.requests.listByEncounter(encounter.organizationId, encounter.encounterId),
    );
  }
}

function encounterNotFound(encounterId: EncounterId): ScheduleChangeRequestNotFound {
  return new ScheduleChangeRequestNotFound({
    code: "scheduling.schedule_change_encounter_not_found",
    message: "Encounter not found",
    encounterId,
  });
}
