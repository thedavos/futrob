import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type EncounterId,
  type Result,
} from "@futrob/shared-kernel";
import type { ScheduleChangeRequest } from "../domain/entities/schedule-change-request.ts";
import {
  ScheduleChangeRequestNotFound,
  UnknownScheduleChangeRequest,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

export interface GetScheduleChangeRequestInput {
  readonly actorId: ActorId;
  readonly encounterId: EncounterId;
  readonly requestId: string;
}

export type GetScheduleChangeRequestError =
  | ScheduleChangeRequestNotFound
  | UnknownScheduleChangeRequest;

/** One request with its full history, for actors who can read its Encounter. */
export class GetScheduleChangeRequestUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly encounters: Pick<EncounterScheduleRepository, "findById">;
      readonly requests: Pick<ScheduleChangeRequestRepository, "findById">;
    },
  ) {}

  async execute(
    input: GetScheduleChangeRequestInput,
  ): Promise<Result<ScheduleChangeRequest, GetScheduleChangeRequestError>> {
    const encounter = await this.deps.encounters.findById(input.encounterId);
    const readable =
      encounter &&
      (
        await this.deps.authorization.decide({
          actorId: input.actorId,
          permission: ENCOUNTER_PERMISSION.read,
          scope: {
            organizationId: encounter.organizationId,
            competitionId: encounter.competitionId,
            encounterId: encounter.encounterId,
          },
        })
      ).allowed;
    if (!encounter || !readable) {
      return err(
        new ScheduleChangeRequestNotFound({
          code: "scheduling.schedule_change_encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
        }),
      );
    }

    const request = await this.deps.requests.findById(encounter.organizationId, input.requestId);
    if (!request || request.encounterId !== encounter.encounterId) {
      return err(
        new UnknownScheduleChangeRequest({
          code: "scheduling.schedule_change_request_not_found",
          message: "Schedule change request not found",
          requestId: input.requestId,
        }),
      );
    }
    return ok(request);
  }
}
