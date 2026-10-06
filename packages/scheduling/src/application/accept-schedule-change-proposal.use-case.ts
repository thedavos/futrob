import {
  asOfficialMatchSlotId,
  err,
  ok,
  type ActorId,
  type EventPublisherPort,
  type Result,
} from "@futrob/shared-kernel";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import type { ScheduleChangeResponder } from "../domain/entities/schedule-change-decision.ts";
import { withAppliedSchedule } from "../domain/entities/schedule-change-application.ts";
import {
  consentToScheduleChange,
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
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { FixturePlanRepository } from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { findEncounter } from "../domain/policies/edit-fixture-encounter.ts";
import { requiredScheduleChangeAuthorities } from "../domain/policies/schedule-change-approval.ts";
import {
  encounterStartOf,
  rescheduleOfficialMatches,
} from "../domain/policies/official-match-schedule.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandContext,
  type ScheduleChangeCommandDeps,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";

export interface AcceptScheduleChangeProposalInput extends ScheduleChangeCommandInput {
  readonly responder: ScheduleChangeResponder;
}

export interface AcceptScheduleChangeProposalDeps extends ScheduleChangeCommandDeps {
  readonly encounters: Pick<EncounterScheduleRepository, "findById" | "upsert">;
  readonly eventPublisher: EventPublisherPort;
  readonly fixtures: Pick<FixturePlanRepository, "listActive" | "updateEncounter">;
  readonly matches: Pick<OfficialMatchRepository, "listByEncounter" | "saveSchedules">;
  readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules" | "countAppliedReschedules">;
}

/**
 * Records the responder's consent to the current proposal. The consent that completes
 * every approval the competition requires also applies the proposal: slot starts,
 * Encounter start, fixture, request status, consumed quota and the application record
 * commit together or not at all.
 */
export class AcceptScheduleChangeProposalUseCase {
  constructor(private readonly deps: AcceptScheduleChangeProposalDeps) {}

  execute(
    input: AcceptScheduleChangeProposalInput,
  ): Promise<Result<ScheduleChangeCommandOutput, AcceptScheduleChangeProposalError>> {
    return runScheduleChangeCommand<AcceptScheduleChangeProposalError>(this.deps, {
      input,
      type: "accept",
      responder: input.responder,
      payload: {},
      movesSchedule: true,
      decide: async (context) => {
        const required = requiredScheduleChangeAuthorities(context.rules);
        if (required.isErr()) return err(required.error);
        const consent = consentToScheduleChange(context.request, {
          target: input,
          decisionId: this.deps.ids.generate(),
          responder: input.responder,
          actorId: input.actorId,
          requiredAuthorities: required.value,
          reason: null,
          now: context.now,
        });
        if (consent.isErr()) return err(consent.error);
        if (consent.value.request.status !== "accepted") return ok(consent.value);
        return this.prepareApplication(context, consent.value, input.actorId);
      },
      afterCommit: (context, transition) => this.applySchedule(context, transition, input.actorId),
    });
  }

  /** Every check that can refuse the application runs before the first write. */
  private async prepareApplication(
    { encounter, schedules, request, rules, now }: ScheduleChangeCommandContext,
    transition: ScheduleChangeTransition,
    actorId: ActorId,
  ): Promise<Result<ScheduleChangeTransition, AcceptScheduleChangeProposalError>> {
    const applied = await this.deps.rules.countAppliedReschedules({
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
    if (proposal.proposedStartAt.getTime() <= now.getTime()) {
      return err(
        new InvalidScheduleChangeDate({
          code: "scheduling.invalid_schedule_change_date",
          message: "The accepted start is no longer in the future",
        }),
      );
    }
    const changes = rescheduleOfficialMatches(request.scope, proposal.proposedStartAt, schedules);
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
        id: this.deps.ids.generate(),
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

  private async applySchedule(
    { encounter, schedules, request, now }: ScheduleChangeCommandContext,
    transition: ScheduleChangeTransition,
    actorId: ActorId,
  ): Promise<Result<void, AcceptScheduleChangeProposalError>> {
    const application = transition.appendedApplication;
    if (!application) return ok(undefined);

    const stored = await this.deps.matches.listByEncounter(encounter.encounterId);
    await this.deps.matches.saveSchedules(
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
              id: asOfficialMatchSlotId(this.deps.ids.generate()),
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
      const saved = await this.deps.encounters.upsert({ ...encounter, scheduledStartAt: startAt });
      if (!saved) return err(encounterNotFound(encounter));
    }

    const plans = await this.deps.fixtures.listActive(
      encounter.organizationId,
      encounter.competitionId,
    );
    for (const plan of plans) {
      const planned = findEncounter(plan, encounter.encounterId);
      if (!planned || planned.scheduledStartAt.getTime() === startAt.getTime()) continue;
      const updated = await this.deps.fixtures.updateEncounter({
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
    await this.deps.eventPublisher.publish(event);
    return ok(undefined);
  }
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
