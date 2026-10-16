import type { ActorId, TeamId } from "@futrob/shared-kernel";
import type {
  ScheduleChangeAuthority,
  ScheduleChangeResponder,
} from "../entities/schedule-change-decision.ts";
import { isRivalOfProposal } from "../entities/schedule-change-proposal.ts";
import {
  currentScheduleChangeProposal,
  hasConsentedToScheduleChange,
  type ScheduleChangeRequest,
} from "../entities/schedule-change-request.ts";
import type { CompetitionRescheduleRules } from "../ports/competition-reschedule-rules.port.ts";
import {
  rescheduleScopesConflict,
  sameRescheduleScope,
  type RescheduleScope,
} from "../value-objects/reschedule-scope.ts";
import { currentStartFor, type OfficialMatchSchedule } from "./official-match-schedule.ts";
import { requiredScheduleChangeAuthorities } from "./schedule-change-approval.ts";

export type ScheduleChangeResponseAction = "accept" | "reject" | "counter";
export type ScheduleChangeAllowedAction = ScheduleChangeResponseAction | "resolve";

/** Why a response is unavailable to this actor right now. */
export type ScheduleChangeResponseBlock =
  | "request_closed"
  | "response_window_closed"
  | "own_proposal"
  | "permission"
  | "already_consented"
  | "rescheduling_disabled"
  | "result_protected";

export type ScheduleChangeCreationBlock = "permission" | "rescheduling_disabled";
export type ScheduleChangeTeamBlock = "limit_reached";
export type ScheduleChangeScopeBlock = "active_request_exists" | "result_protected";

/** What the actor holds for one Encounter. */
export interface ScheduleChangeActorAuthority {
  readonly actorId: ActorId;
  /** Encounter Teams the actor may request and answer reschedules for. */
  readonly teamIds: readonly TeamId[];
  /** May resolve escalated requests and give organizer approval. */
  readonly organizer: boolean;
}

/** Encounter facts every capability reads. */
export interface ScheduleChangeFacts {
  readonly now: Date;
  readonly rules: CompetitionRescheduleRules;
  /** Scopes the edit guard lets a reschedule move. */
  readonly editableScopes: readonly RescheduleScope[];
}

export interface ScheduleChangeRequestCapabilities {
  readonly allowedActions: readonly ScheduleChangeAllowedAction[];
  /** Capacity accept and reject are sent with; counter always answers as the rival Team. */
  readonly respondAs: ScheduleChangeResponder | null;
  readonly blockedActions: readonly {
    readonly action: ScheduleChangeResponseAction;
    readonly reason: ScheduleChangeResponseBlock;
  }[];
}

export interface ScheduleChangeCreationOptions {
  readonly blockedReason: ScheduleChangeCreationBlock | null;
  readonly teams: readonly {
    readonly teamId: TeamId;
    readonly blockedReason: ScheduleChangeTeamBlock | null;
  }[];
  readonly scopes: readonly {
    readonly scope: RescheduleScope;
    readonly currentStartAt: Date;
    readonly blockedReason: ScheduleChangeScopeBlock | null;
  }[];
}

const RESPONSE_ACTIONS = [
  "accept",
  "reject",
  "counter",
] as const satisfies readonly ScheduleChangeResponseAction[];

/** One verdict per response action, so allowed and blocked cannot overlap or miss one. */
interface ResponseVerdicts {
  readonly respondAs: ScheduleChangeResponder | null;
  readonly blocks: Readonly<
    Record<ScheduleChangeResponseAction, ScheduleChangeResponseBlock | null>
  >;
}

/**
 * Predicts which negotiation commands the actor's next call would pass on permission,
 * state, deadline and result protection. Minimum notice and version races stay errors.
 */
export function scheduleChangeRequestCapabilities(
  request: ScheduleChangeRequest,
  authority: ScheduleChangeActorAuthority,
  facts: ScheduleChangeFacts,
): ScheduleChangeRequestCapabilities {
  const { respondAs, blocks } = responseVerdicts(request, authority, facts);
  const resolvable = request.status === "escalated" && authority.organizer;
  return {
    allowedActions: [
      ...RESPONSE_ACTIONS.filter((action) => blocks[action] === null),
      ...(resolvable ? (["resolve"] as const) : []),
    ],
    respondAs,
    blockedActions: RESPONSE_ACTIONS.flatMap((action) => {
      const reason = blocks[action];
      return reason === null ? [] : [{ action, reason }];
    }),
  };
}

function responseVerdicts(
  request: ScheduleChangeRequest,
  authority: ScheduleChangeActorAuthority,
  facts: ScheduleChangeFacts,
): ResponseVerdicts {
  const everyAction = (reason: ScheduleChangeResponseBlock): ResponseVerdicts => ({
    respondAs: null,
    blocks: { accept: reason, reject: reason, counter: reason },
  });
  if (request.status !== "open") return everyAction("request_closed");
  const proposal = currentScheduleChangeProposal(request);
  if (facts.now.getTime() >= proposal.responseDeadline.getTime()) {
    return everyAction("response_window_closed");
  }

  const rivalTeamId = authority.teamIds.find((teamId) =>
    isRivalOfProposal(proposal, { teamId, actorId: authority.actorId }),
  );
  const required: readonly ScheduleChangeAuthority[] = requiredScheduleChangeAuthorities(
    facts.rules,
  ).unwrapOr([]);
  const capacities: readonly ScheduleChangeResponder[] = [
    ...(rivalTeamId !== undefined && required.includes("rival_team")
      ? [{ authority: "rival_team", teamId: rivalTeamId } as const]
      : []),
    ...(authority.organizer && required.includes("organizer")
      ? [{ authority: "organizer" } as const]
      : []),
  ];
  const consented = (responder: ScheduleChangeResponder) =>
    hasConsentedToScheduleChange(request, proposal.id, responder, authority.actorId);
  const respondAs = capacities.find((capacity) => !consented(capacity)) ?? capacities[0] ?? null;

  const ownsProposal =
    authority.actorId === proposal.proposedByActorId ||
    authority.teamIds.includes(proposal.proposedByTeamId);
  const notAParty = ownsProposal ? "own_proposal" : "permission";
  const movesSchedule = !facts.rules.allowRescheduling
    ? "rescheduling_disabled"
    : facts.editableScopes.some((scope) => sameRescheduleScope(scope, request.scope))
      ? null
      : "result_protected";

  return {
    respondAs,
    blocks: {
      accept: !respondAs ? notAParty : consented(respondAs) ? "already_consented" : movesSchedule,
      reject: !respondAs ? notAParty : null,
      counter: rivalTeamId === undefined ? notAParty : movesSchedule,
    },
  };
}

/** What a new request may name: the Teams the actor speaks for and the Encounter's scopes. */
export function scheduleChangeCreationOptions(input: {
  readonly authority: ScheduleChangeActorAuthority;
  readonly facts: ScheduleChangeFacts;
  readonly officialMatchCount: 1 | 2;
  readonly schedules: readonly OfficialMatchSchedule[];
  /** Open and escalated requests of the Encounter. */
  readonly activeRequests: readonly Pick<ScheduleChangeRequest, "scope">[];
  readonly appliedReschedules: ReadonlyMap<TeamId, number>;
}): ScheduleChangeCreationOptions {
  const { authority, facts } = input;
  return {
    blockedReason:
      authority.teamIds.length === 0
        ? "permission"
        : facts.rules.allowRescheduling
          ? null
          : "rescheduling_disabled",
    teams: authority.teamIds.map((teamId) => ({
      teamId,
      blockedReason:
        (input.appliedReschedules.get(teamId) ?? 0) >= facts.rules.maxReschedulesPerTeam
          ? "limit_reached"
          : null,
    })),
    scopes: creatableRescheduleScopes(input.officialMatchCount).flatMap((scope) => {
      const currentStartAt = currentStartFor(scope, input.schedules);
      if (!currentStartAt) return [];
      const blockedReason = input.activeRequests.some((request) =>
        rescheduleScopesConflict(request.scope, scope),
      )
        ? "active_request_exists"
        : facts.editableScopes.some((editable) => sameRescheduleScope(editable, scope))
          ? null
          : "result_protected";
      return [{ scope, currentStartAt, blockedReason }];
    }),
  };
}

/** A single-slot Encounter moves as a whole; a two-slot one also moves each slot alone. */
export function creatableRescheduleScopes(officialMatchCount: 1 | 2): readonly RescheduleScope[] {
  return officialMatchCount === 2
    ? [
        { type: "entire_encounter" },
        { type: "official_match", officialSlot: 1 },
        { type: "official_match", officialSlot: 2 },
      ]
    : [{ type: "entire_encounter" }];
}
