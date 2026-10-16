import { err, ok, type ActorId, type EncounterId, type Result } from "@futrob/shared-kernel";
import type { ScheduleChangeRequest } from "../domain/entities/schedule-change-request.ts";
import {
  ScheduleChangeRequestNotFound,
  UnknownScheduleChangeRequest,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import {
  scheduleChangeRequestCapabilities,
  type ScheduleChangeRequestCapabilities,
} from "../domain/policies/schedule-change-capabilities.ts";
import {
  readScheduleChangeAuthority,
  readScheduleChangeFacts,
  type ScheduleChangeCapabilityDeps,
} from "./read-schedule-change-capabilities.ts";

export interface GetScheduleChangeRequestInput {
  readonly actorId: ActorId;
  readonly encounterId: EncounterId;
  readonly requestId: string;
}

/** A request with what the reading actor may do with it now. */
export interface ScheduleChangeRequestView {
  readonly request: ScheduleChangeRequest;
  readonly capabilities: ScheduleChangeRequestCapabilities;
}

export type GetScheduleChangeRequestError =
  | ScheduleChangeRequestNotFound
  | UnknownScheduleChangeRequest;

/** One request with its full history, for actors who can read its Encounter. */
export class GetScheduleChangeRequestUseCase {
  constructor(
    private readonly deps: ScheduleChangeCapabilityDeps & {
      readonly encounters: Pick<EncounterScheduleRepository, "findById">;
      readonly requests: Pick<ScheduleChangeRequestRepository, "findById">;
    },
  ) {}

  async execute(
    input: GetScheduleChangeRequestInput,
  ): Promise<Result<ScheduleChangeRequestView, GetScheduleChangeRequestError>> {
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
    const [authority, facts] = await Promise.all([
      readScheduleChangeAuthority(this.deps.authorization, input.actorId, encounter),
      readScheduleChangeFacts(this.deps, encounter, [request.scope]),
    ]);
    return ok({
      request,
      capabilities: scheduleChangeRequestCapabilities(request, authority, facts),
    });
  }
}
