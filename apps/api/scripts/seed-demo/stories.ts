import type { OfficialSelectionCommandResponse } from "@futrob/api-contracts";
import { asActorId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import type { DemoAccount } from "./accounts.ts";
import type { SeedContext } from "./context.ts";
import {
  commandKey,
  COMPETITION_TIME_ZONE,
  HOURS,
  limaWallTime,
  type CompetitionHandle,
  type PlayableEncounter,
} from "./engine.ts";
import type { DemoMatch } from "./fake-ea.ts";

const HOUR_MS = HOURS;

// ── Official selection stories ─────────────────────────────────────────────

interface SlotSelection {
  readonly officialSlot: 1 | 2;
  readonly providerMatchRef: { readonly providerKey: "ea-clubs"; readonly externalId: string };
}

function slots(matches: readonly DemoMatch[], pick: readonly number[]): SlotSelection[] {
  return pick.map((matchIndex, slotIndex) => ({
    officialSlot: slotIndex === 0 ? 1 : 2,
    providerMatchRef: {
      providerKey: "ea-clubs",
      externalId: matches[matchIndex]!.matchId,
    },
  }));
}

function officialPick(encounter: PlayableEncounter): number[] {
  return encounter.officialMatchCount === 2 ? [0, 1] : [0];
}

export interface StoryInput {
  readonly context: SeedContext;
  readonly competition: CompetitionHandle;
  readonly encounter: PlayableEncounter;
  readonly matches: readonly DemoMatch[];
}

function captainOf(input: StoryInput, teamId: string): DemoAccount {
  const captain = input.competition.captains.get(teamId);
  if (!captain) throw new Error(`No captain for team ${teamId} in ${input.competition.name}`);
  return captain;
}

export function rivalOf(encounter: PlayableEncounter, teamId: string): string {
  return encounter.homeTeamId === teamId ? encounter.awayTeamId : encounter.homeTeamId;
}

export async function propose(
  input: StoryInput,
  at: Date,
  options: { readonly pick?: readonly number[]; readonly teamId?: string } = {},
): Promise<OfficialSelectionCommandResponse> {
  const { context, competition, encounter } = input;
  const teamId = options.teamId ?? encounter.homeTeamId;
  const pick = options.pick ?? officialPick(encounter);
  return context.clock.at(at, () =>
    context
      .as(captainOf(input, teamId))
      .results.proposeOfficialSelection(competition.org.id, encounter.id, {
        actingTeamId: teamId,
        selections: slots(input.matches, pick),
        expectedVersion: 0,
        commandKey: commandKey("propose"),
      }),
  );
}

export async function confirm(
  input: StoryInput,
  proposed: OfficialSelectionCommandResponse,
  at: Date,
  teamId?: string,
): Promise<OfficialSelectionCommandResponse> {
  const { context, competition, encounter } = input;
  teamId ??= rivalOf(encounter, proposed.proposal?.proposingTeamId ?? encounter.homeTeamId);
  return context.clock.at(at, () =>
    context
      .as(captainOf(input, teamId))
      .results.confirmOfficialSelection(competition.org.id, encounter.id, proposed.proposal!.id, {
        actingTeamId: teamId,
        expectedVersion: proposed.selection.version,
        commandKey: commandKey("confirm"),
      }),
  );
}

/** Home proposes three hours after kickoff and the rival confirms two hours later. */
export async function playOfficial(input: StoryInput): Promise<OfficialSelectionCommandResponse> {
  const proposed = await propose(input, new Date(input.encounter.kickoff.getTime() + 3 * HOUR_MS));
  return confirm(input, proposed, new Date(input.encounter.kickoff.getTime() + 5 * HOUR_MS));
}

/**
 * The rival answers with its own pick (a rematch). An alternative opens a dispute, so the
 * organizer reviews it and approves the alternative.
 */
export async function playWithAlternative(input: StoryInput): Promise<void> {
  const { context, competition, encounter } = input;
  const kickoff = encounter.kickoff.getTime();
  const proposed = await propose(input, new Date(kickoff + 3 * HOUR_MS));
  const alternativePick = encounter.officialMatchCount === 2 ? [1, 2] : [1];
  const alternative = await context.clock.at(new Date(kickoff + 4 * HOUR_MS), () =>
    context
      .as(captainOf(input, encounter.awayTeamId))
      .results.proposeAlternativeOfficialSelection(
        competition.org.id,
        encounter.id,
        proposed.proposal!.id,
        {
          actingTeamId: encounter.awayTeamId,
          selections: slots(input.matches, alternativePick),
          reason: "El primer partido fue un amistoso de calentamiento; cuenta la revancha.",
          expectedVersion: proposed.selection.version,
          commandKey: commandKey("alternative"),
        },
      ),
  );
  const reviewed = await reviewDispute(input, alternative, new Date(kickoff + 20 * HOUR_MS));
  await resolveDisputeApproving(
    input,
    reviewed,
    alternative.proposal!.id,
    new Date(kickoff + 24 * HOUR_MS),
  );
}

/** The rival of the proposing Team disputes its proposal. */
export async function openDispute(
  input: StoryInput,
  proposed: OfficialSelectionCommandResponse,
  at: Date,
): Promise<OfficialSelectionCommandResponse> {
  const { context, competition, encounter } = input;
  const teamId = rivalOf(encounter, proposed.proposal?.proposingTeamId ?? encounter.homeTeamId);
  return context.clock.at(at, () =>
    context
      .as(captainOf(input, teamId))
      .results.openMatchDispute(competition.org.id, encounter.id, {
        actingTeamId: teamId,
        expectedVersion: proposed.selection.version,
        commandKey: commandKey("dispute"),
        reason: "El rival se desconectó en el minuto 70 y el partido elegido no refleja lo jugado.",
      }),
  );
}

export async function reviewDispute(
  input: StoryInput,
  disputed: OfficialSelectionCommandResponse,
  at: Date,
): Promise<OfficialSelectionCommandResponse> {
  const { context, competition, encounter } = input;
  return context.clock.at(at, () =>
    context
      .as(competition.org.organizer)
      .results.reviewMatchDispute(competition.org.id, encounter.id, {
        expectedVersion: disputed.selection.version,
        commandKey: commandKey("review"),
        reason: "Revisando capturas y el historial de EA de ambos clubes.",
      }),
  );
}

export async function resolveDisputeApproving(
  input: StoryInput,
  reviewed: OfficialSelectionCommandResponse,
  proposalId: string,
  at: Date,
): Promise<OfficialSelectionCommandResponse> {
  const { context, competition, encounter } = input;
  return context.clock.at(at, () =>
    context
      .as(competition.org.organizer)
      .results.resolveMatchDispute(competition.org.id, encounter.id, {
        expectedVersion: reviewed.selection.version,
        commandKey: commandKey("resolve"),
        reason: "La desconexión fue posterior al gol decisivo; se mantiene la propuesta.",
        decision: { type: "approve_proposal", proposalId },
      }),
  );
}

/** Proposal whose 24-hour confirmation window already closed, expired by the system. */
export async function expireConfirmation(input: StoryInput, proposedAt: Date): Promise<void> {
  const proposed = await propose(input, proposedAt);
  const expired = await input.context.modules.officialSelection.expire.execute({
    actorId: asActorId(input.context.systemActorId),
    organizationId: asOrganizationId(input.competition.org.id),
    encounterId: asEncounterId(input.encounter.id),
    proposalId: proposed.proposal!.id,
  });
  if (!expired.isOk()) throw expired.error;
}

// ── Schedule changes ─────────────────────────────────────────────────────────

export async function requestReschedule(
  input: Omit<StoryInput, "matches">,
  options: {
    readonly at: Date;
    readonly to: Date;
    readonly reason: string;
    readonly teamId?: string;
    readonly slot?: 1 | 2;
  },
) {
  const { context, competition, encounter } = input;
  const teamId = options.teamId ?? encounter.homeTeamId;
  const captain = competition.captains.get(teamId)!;
  return context.clock.at(options.at, () =>
    context.as(captain).encounters.createScheduleChangeRequest(encounter.id, {
      requestingTeamId: teamId,
      scope: options.slot
        ? { type: "official_match", officialSlot: options.slot }
        : { type: "entire_encounter" },
      proposedWallTime: limaWallTime(options.to),
      reason: options.reason,
      idempotencyKey: commandKey("reschedule"),
      timeZone: COMPETITION_TIME_ZONE,
    }),
  );
}

type ScheduleChangeRequest = Awaited<ReturnType<typeof requestReschedule>>;

export async function counterReschedule(
  input: Omit<StoryInput, "matches">,
  request: ScheduleChangeRequest,
  options: {
    readonly at: Date;
    readonly to: Date;
    readonly teamId: string;
    readonly reason: string;
  },
): Promise<ScheduleChangeRequest> {
  const { context, competition, encounter } = input;
  const result = await context.clock.at(options.at, () =>
    context.as(competition.captains.get(options.teamId)!).encounters.counterScheduleChangeProposal(
      { encounterId: encounter.id, requestId: request.id, proposalId: request.currentProposalId },
      {
        expectedVersion: request.version,
        commandKey: commandKey("counter"),
        teamId: options.teamId,
        proposedWallTime: limaWallTime(options.to),
        reason: options.reason,
        timeZone: COMPETITION_TIME_ZONE,
      },
    ),
  );
  return result.request;
}

export async function acceptReschedule(
  input: Omit<StoryInput, "matches">,
  request: ScheduleChangeRequest,
  options: { readonly at: Date; readonly teamId: string },
): Promise<ScheduleChangeRequest> {
  const { context, competition, encounter } = input;
  const result = await context.clock.at(options.at, () =>
    context.as(competition.captains.get(options.teamId)!).encounters.acceptScheduleChangeProposal(
      { encounterId: encounter.id, requestId: request.id, proposalId: request.currentProposalId },
      {
        expectedVersion: request.version,
        commandKey: commandKey("accept"),
        responder: { authority: "rival_team", teamId: options.teamId },
      },
    ),
  );
  return result.request;
}

/** Expires the demo organization's schedule change requests whose response window closed. */
export async function expireDueScheduleChanges(
  context: SeedContext,
  organizationIds: ReadonlySet<string>,
): Promise<number> {
  const due = await context.modules.scheduling.scheduleChangeExpiryFeed.listDue({
    dueAt: context.clock.now(),
    limit: 200,
  });
  let expired = 0;
  for (const request of due) {
    if (!organizationIds.has(String(request.organizationId))) continue;
    const result = await context.modules.activityCommands.expireScheduleChangeProposal.execute({
      ...request,
      actorId: asActorId(context.systemActorId),
    });
    if (result.isOk()) expired += 1;
    else context.warn(`schedule change expiry ${request.requestId}: ${result.error.code}`);
  }
  return expired;
}
