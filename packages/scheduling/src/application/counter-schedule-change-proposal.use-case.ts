import { err, type Result, type TeamId } from "@futrob/shared-kernel";
import { createScheduleChangeProposal } from "../domain/entities/schedule-change-proposal.ts";
import { counterScheduleChange } from "../domain/entities/schedule-change-request.ts";
import {
  InvalidScheduleChangeDate,
  ScheduleChangeRequestNotFound,
  type CounterScheduleChangeProposalError,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { CompetitionTimeZonePort } from "../domain/ports/competition-time-zone.port.ts";
import {
  interpretCompetitionWallTime,
  type CompetitionWallTime,
} from "../domain/policies/interpret-competition-wall-time.ts";
import {
  runScheduleChangeCommand,
  type ScheduleChangeCommandDeps,
  type ScheduleChangeCommandInput,
  type ScheduleChangeCommandOutput,
} from "./schedule-change-command.ts";

export interface CounterScheduleChangeProposalInput extends ScheduleChangeCommandInput {
  /** The rival Team of the current proposal, answering with a new date. */
  readonly teamId: TeamId;
  readonly timeZone?: string;
  readonly proposedWallTime: CompetitionWallTime;
  readonly reason: string;
}

/**
 * Appends a counter-proposal that becomes current. Consents given to earlier
 * proposals stay in history but no longer count toward acceptance.
 */
export class CounterScheduleChangeProposalUseCase {
  constructor(
    private readonly deps: ScheduleChangeCommandDeps & {
      readonly timeZones: CompetitionTimeZonePort;
    },
  ) {}

  execute(
    input: CounterScheduleChangeProposalInput,
  ): Promise<Result<ScheduleChangeCommandOutput, CounterScheduleChangeProposalError>> {
    const wall = input.proposedWallTime;
    return runScheduleChangeCommand<CounterScheduleChangeProposalError>(this.deps, {
      input,
      type: "counter",
      responder: { authority: "rival_team", teamId: input.teamId },
      payload: {
        timeZone: input.timeZone?.trim() || null,
        wallTime: `${wall.year}-${wall.month}-${wall.day}T${wall.hour}:${wall.minute}:${wall.second}`,
        reason: input.reason.trim(),
      },
      movesSchedule: true,
      decide: async ({ encounter, request, now }) => {
        const timeZone = await this.deps.timeZones.getTimeZone({
          organizationId: encounter.organizationId,
          competitionId: encounter.competitionId,
        });
        if (!timeZone) {
          return err(
            new ScheduleChangeRequestNotFound({
              code: "scheduling.schedule_change_encounter_not_found",
              message: "Encounter not found",
              encounterId: encounter.encounterId,
            }),
          );
        }
        const clientTimeZone = input.timeZone?.trim();
        if (clientTimeZone && clientTimeZone !== timeZone) {
          return err(
            new InvalidScheduleChangeDate({
              code: "scheduling.invalid_schedule_change_date",
              message: "The proposed time zone must match the competition time zone",
            }),
          );
        }
        const proposedStartAt = interpretCompetitionWallTime({ wallTime: wall, timeZone });
        if (proposedStartAt.isErr()) return err(proposedStartAt.error);

        const proposal = createScheduleChangeProposal({
          id: this.deps.ids.generate(),
          proposedStartAt: proposedStartAt.value,
          currentStartAt: encounter.scheduledStartAt,
          proposedByActorId: input.actorId,
          proposedByTeamId: input.teamId,
          reason: input.reason,
          now,
        });
        if (proposal.isErr()) return err(proposal.error);
        return counterScheduleChange(request, { target: input, proposal: proposal.value, now });
      },
    });
  }
}
