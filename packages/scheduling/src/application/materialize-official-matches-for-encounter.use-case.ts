import {
  asOfficialMatchSlotId,
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import {
  EncounterScheduleAuthorizationForbidden,
  EncounterScheduleNotFound,
  type MaterializeOfficialMatchesError,
} from "../domain/errors/encounter-schedule.errors.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

export interface MaterializeOfficialMatchesForEncounterInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
}

export class MaterializeOfficialMatchesForEncounterUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly clock: ClockPort;
      readonly encounters: EncounterScheduleRepository;
      readonly ids: IdGeneratorPort;
      readonly matches: OfficialMatchRepository;
    },
  ) {}

  async execute(
    input: MaterializeOfficialMatchesForEncounterInput,
  ): Promise<Result<OfficialMatch[], MaterializeOfficialMatchesError>> {
    const encounter = await this.deps.encounters.findById(input.encounterId);
    if (!encounter || encounter.organizationId !== input.organizationId) {
      return err(
        new EncounterScheduleNotFound({
          code: "scheduling.encounter_schedule_not_found",
          message: "Encounter schedule not found",
          encounterId: input.encounterId,
        }),
      );
    }

    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: {
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
      },
    });
    if (!decision.allowed) {
      return err(
        new EncounterScheduleAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot materialize official matches for this encounter",
          permission: ENCOUNTER_PERMISSION.scheduleManage,
        }),
      );
    }

    const slots: readonly OfficialMatch["slot"][] =
      encounter.officialMatchCount === 1 ? [1] : [1, 2];
    const existing = await this.deps.matches.listByEncounter(encounter.encounterId);
    const existingBySlot = new Map(existing.map((match) => [match.slot, match]));
    const createdAt = this.deps.clock.now();
    const desired = slots.map(
      (slot): OfficialMatch =>
        existingBySlot.get(slot) ?? {
          id: asOfficialMatchSlotId(this.deps.ids.generate()),
          encounterId: encounter.encounterId,
          organizationId: encounter.organizationId,
          competitionId: encounter.competitionId,
          slot,
          status: "scheduled",
          createdAt,
        },
    );

    await this.deps.matches.upsertMany(desired);

    const persisted = await this.deps.matches.listByEncounter(encounter.encounterId);
    const desiredSlots = new Set(slots);
    return ok(
      persisted
        .filter((match) => desiredSlots.has(match.slot))
        .sort((left, right) => left.slot - right.slot),
    );
  }
}
