import { err, ok, type ActorId, type AuthorizationPort, type Result } from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import {
  EncounterScheduleAuthorizationForbidden,
  FixtureManagedEncounterConflict,
  InvalidEncounterSchedule,
  type UpsertEncounterScheduleError,
} from "../domain/errors/encounter-schedule.errors.ts";
import type {
  EncounterParticipantValidationPort,
  EncounterScheduleRepository,
} from "../domain/ports/encounter-schedule.repository.ts";
import type { FixturePlanRepository } from "../domain/ports/fixture-plan.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

/** Producer for the scheduling projection consumed by authorization and results. */
export class UpsertEncounterScheduleSnapshotUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly encounters: EncounterScheduleRepository;
      readonly fixtureOwnership: Pick<FixturePlanRepository, "containsEncounter">;
      readonly participants: EncounterParticipantValidationPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly snapshot: EncounterScheduleSnapshot;
  }): Promise<Result<EncounterScheduleSnapshot, UpsertEncounterScheduleError>> {
    const { snapshot } = input;
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: {
        organizationId: snapshot.organizationId,
        competitionId: snapshot.competitionId,
      },
    });
    if (!decision.allowed) {
      return err(
        new EncounterScheduleAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot create or update encounter scheduling data",
          permission: ENCOUNTER_PERMISSION.scheduleManage,
        }),
      );
    }
    if (
      snapshot.homeTeamId === snapshot.awayTeamId ||
      !Number.isFinite(snapshot.scheduledStartAt.getTime()) ||
      (snapshot.officialMatchCount !== 1 && snapshot.officialMatchCount !== 2)
    ) {
      return err(
        new InvalidEncounterSchedule({
          code: "scheduling.invalid_encounter_schedule",
          message: "Encounter schedule must contain two distinct teams and a valid start time",
        }),
      );
    }
    if (
      await this.deps.fixtureOwnership.containsEncounter({
        organizationId: snapshot.organizationId,
        competitionId: snapshot.competitionId,
        encounterId: snapshot.encounterId,
      })
    ) {
      return err(
        new FixtureManagedEncounterConflict({
          code: "scheduling.fixture_managed_conflict",
          message: "Fixture-managed encounters must be changed through the audited fixture edit",
          encounterId: snapshot.encounterId,
        }),
      );
    }
    const existing = await this.deps.encounters.findById(snapshot.encounterId);
    if (
      existing &&
      (existing.organizationId !== snapshot.organizationId ||
        existing.competitionId !== snapshot.competitionId)
    ) {
      return err(
        new InvalidEncounterSchedule({
          code: "scheduling.invalid_encounter_schedule",
          message: "An encounter cannot be moved to another organization or competition",
        }),
      );
    }
    const approved = await Promise.all(
      [snapshot.homeTeamId, snapshot.awayTeamId].map((teamId) =>
        this.deps.participants.isApprovedParticipant({
          organizationId: snapshot.organizationId,
          competitionId: snapshot.competitionId,
          teamId,
        }),
      ),
    );
    if (approved.some((value) => !value)) {
      return err(
        new InvalidEncounterSchedule({
          code: "scheduling.invalid_encounter_schedule",
          message: "Both encounter teams must be approved participants owned by the tenant",
        }),
      );
    }
    const saved = await this.deps.encounters.upsert(snapshot);
    if (!saved) {
      return err(
        new InvalidEncounterSchedule({
          code: "scheduling.invalid_encounter_schedule",
          message: "Encounter identity changed concurrently and cannot be overwritten",
        }),
      );
    }
    return ok(saved);
  }
}
