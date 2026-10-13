import { asOfficialMatchSlotId, err, ok, type ActorId, type Result } from "@futrob/shared-kernel";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import { withAppliedSchedule } from "../domain/entities/schedule-change-application.ts";
import {
  currentScheduleChangeProposal,
  type ScheduleChangeTransition,
} from "../domain/entities/schedule-change-request.ts";
import { FixtureUpdateConflict } from "../domain/errors/fixture.errors.ts";
import {
  InvalidScheduleChangeDate,
  InvalidScheduleChangeScope,
  RescheduleLimitReached,
  ScheduleChangeRequestNotFound,
  type AcceptScheduleChangeProposalError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { EncounterRescheduledEvent } from "../domain/events/encounter-rescheduled.event.ts";
import { findEncounter } from "../domain/policies/edit-fixture-encounter.ts";
import {
  currentStartFor,
  encounterStartOf,
  rescheduleOfficialMatches,
} from "../domain/policies/official-match-schedule.ts";
import type { ScheduleChangeCommandContext } from "./schedule-change-command.ts";
import type { AcceptScheduleChangeProposalDeps } from "./accept-schedule-change-proposal.use-case.ts";

/** Every check that can refuse the application runs before the first write. */
export async function prepareScheduleChangeApplication(
  deps: AcceptScheduleChangeProposalDeps,
  { encounter, schedules, request, rules, now }: ScheduleChangeCommandContext,
  transition: ScheduleChangeTransition,
  actorId: ActorId,
  proposedStartAt: Date = currentScheduleChangeProposal(request).proposedStartAt,
): Promise<Result<ScheduleChangeTransition, AcceptScheduleChangeProposalError>> {
  const applied = await deps.rules.countAppliedReschedules({
    organizationId: request.organizationId,
    competitionId: request.competitionId,
    encounterId: request.encounterId,
    teamId: request.requestingTeamId,
  });
  if (applied >= rules.maxReschedulesPerTeam) {
    return err(
      new RescheduleLimitReached({
        code: "scheduling.reschedule_limit_reached",
        message: "The requesting Team has reached its reschedule limit for this Encounter",
        teamId: request.requestingTeamId,
        limit: rules.maxReschedulesPerTeam,
      }),
    );
  }

  const proposal = currentScheduleChangeProposal(request);
  if (
    !Number.isFinite(proposedStartAt.getTime()) ||
    proposedStartAt.getTime() <= now.getTime() ||
    proposedStartAt.getTime() === currentStartFor(request.scope, schedules)?.getTime()
  ) {
    return err(
      new InvalidScheduleChangeDate({
        code: "scheduling.invalid_schedule_change_date",
        message: "The accepted start is no longer in the future",
      }),
    );
  }
  const changes = rescheduleOfficialMatches(request.scope, proposedStartAt, schedules);
  const previousStart = encounterStartOf(schedules);
  const appliedStart = changes
    ? encounterStartOf(
        changes.map((change) => ({ slot: change.slot, scheduledStartAt: change.appliedStartAt })),
      )
    : null;
  if (!changes || !previousStart || !appliedStart) {
    return err(
      new InvalidScheduleChangeScope({
        code: "scheduling.invalid_schedule_change_scope",
        message: "The requested OfficialMatch slot does not exist",
        encounterId: encounter.encounterId,
      }),
    );
  }

  return ok(
    withAppliedSchedule(transition, {
      id: deps.ids.generate(),
      proposalId: proposal.id,
      requestVersion: transition.request.version,
      appliedByActorId: actorId,
      previousEncounterStartAt: previousStart,
      appliedEncounterStartAt: appliedStart,
      slots: changes.filter(
        (change) => change.previousStartAt.getTime() !== change.appliedStartAt.getTime(),
      ),
      appliedAt: new Date(now.getTime()),
    }),
  );
}

export async function applyScheduleChange(
  deps: AcceptScheduleChangeProposalDeps,
  { encounter, schedules, request, now }: ScheduleChangeCommandContext,
  transition: ScheduleChangeTransition,
  actorId: ActorId,
): Promise<Result<void, AcceptScheduleChangeProposalError>> {
  const application = transition.appendedApplication;
  if (!application) return ok(undefined);

  const stored = await deps.matches.listByEncounter(encounter.encounterId);
  await deps.matches.saveSchedules(
    schedules.map((schedule): OfficialMatch => {
      const scheduledStartAt = new Date(
        (
          application.slots.find((change) => change.slot === schedule.slot)?.appliedStartAt ??
          schedule.scheduledStartAt
        ).getTime(),
      );
      const row = stored.find((match) => match.slot === schedule.slot);
      return row
        ? { ...row, scheduledStartAt }
        : {
            id: asOfficialMatchSlotId(deps.ids.generate()),
            encounterId: encounter.encounterId,
            organizationId: encounter.organizationId,
            competitionId: encounter.competitionId,
            slot: schedule.slot,
            status: "scheduled",
            scheduledStartAt,
            createdAt: new Date(now.getTime()),
          };
    }),
  );

  const startAt = application.appliedEncounterStartAt;
  if (startAt.getTime() !== encounter.scheduledStartAt.getTime()) {
    const saved = await deps.encounters.upsert({ ...encounter, scheduledStartAt: startAt });
    if (!saved) return err(encounterNotFound(encounter));
  }

  const plans = await deps.fixtures.listActive(encounter.organizationId, encounter.competitionId);
  for (const plan of plans) {
    const planned = findEncounter(plan, encounter.encounterId);
    if (!planned || planned.scheduledStartAt.getTime() === startAt.getTime()) continue;
    const updated = await deps.fixtures.updateEncounter({
      organizationId: plan.organizationId,
      competitionId: plan.competitionId,
      fixturePlanId: plan.id,
      revision: plan.revision,
      encounter: { ...planned, scheduledStartAt: startAt },
    });
    if (!updated) {
      return err(
        new FixtureUpdateConflict({
          code: "scheduling.fixture_update_conflict",
          message: "The fixture changed concurrently",
        }),
      );
    }
  }

  const event: EncounterRescheduledEvent = {
    eventName: "scheduling.encounter-rescheduled",
    occurredAt: application.appliedAt.toISOString(),
    correlationId: request.id,
    payload: {
      encounterId: encounter.encounterId,
      previousStartAt: application.previousEncounterStartAt.toISOString(),
      newStartAt: startAt.toISOString(),
      scope: request.scope,
      approvedBy: actorId,
    },
  };
  await deps.eventPublisher.publish(event);
  return ok(undefined);
}

function encounterNotFound(
  encounter: ScheduleChangeCommandContext["encounter"],
): ScheduleChangeRequestNotFound {
  return new ScheduleChangeRequestNotFound({
    code: "scheduling.schedule_change_encounter_not_found",
    message: "Encounter not found",
    encounterId: encounter.encounterId,
  });
}
