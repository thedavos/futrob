import type {
  EncounterViewDto,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import type { FutrobApiError } from "../errors.ts";

/**
 * Pure rescheduling view model shared by clients. Every decision comes from the server's
 * `allowedActions`, `blockedActions`, `respondAs` and creation options; the API authorizes each
 * command again.
 */

/** The parts of an Encounter view the model reads. */
type Encounter = Pick<EncounterViewDto, "scheduledStartAt" | "officialMatches"> & {
  readonly home: { readonly teamId: string };
  readonly away: { readonly teamId: string };
};
export type RescheduleScope = ScheduleChangeRequestDto["scope"];
export type ScheduleChangeResponseAction = "accept" | "reject" | "counter";
export type ScheduleChangeCommandName = "create" | ScheduleChangeResponseAction;

const RESPONSE_ACTIONS = ["accept", "reject", "counter"] as const;

/** Stable key of a scope, for choices and list keys. */
export function rescheduleScopeKey(scope: RescheduleScope): string {
  return scope.type === "entire_encounter" ? "entire" : `slot-${scope.officialSlot}`;
}

/** The proposal commands may answer: the request's current one. */
export function currentScheduleChangeProposal(request: ScheduleChangeRequestDto) {
  return (
    request.proposals.find((proposal) => proposal.id === request.currentProposalId) ??
    request.proposals[request.proposals.length - 1]!
  );
}

/** Where the scope starts now, from the Encounter the client also shows. */
export function scheduleChangeCurrentStart(scope: RescheduleScope, encounter: Encounter): string {
  return scope.type === "entire_encounter"
    ? encounter.scheduledStartAt
    : (encounter.officialMatches.find((match) => match.officialSlot === scope.officialSlot)
        ?.scheduledStartAt ?? encounter.scheduledStartAt);
}

/**
 * What the request's headline can truthfully say. The live schedule is the origin only while the
 * request is undecided; once applied, the stored application is the history.
 */
export type ScheduleChangeSummary =
  | { readonly kind: "pending"; readonly from: string; readonly to: string }
  | { readonly kind: "applied"; readonly from: string; readonly to: string }
  | { readonly kind: "closed"; readonly to: string };

export function scheduleChangeSummary(
  request: ScheduleChangeRequestDto,
  encounter: Encounter,
): ScheduleChangeSummary {
  const proposal = currentScheduleChangeProposal(request);
  const { application, scope } = request;
  if (application) {
    if (scope.type === "entire_encounter") {
      return {
        kind: "applied",
        from: application.previousEncounterStartAt,
        to: application.appliedEncounterStartAt,
      };
    }
    const slot = application.slots.find((moved) => moved.officialSlot === scope.officialSlot);
    if (slot) return { kind: "applied", from: slot.previousStartAt, to: slot.appliedStartAt };
  }
  if (request.status === "open" || request.status === "escalated") {
    return {
      kind: "pending",
      from: scheduleChangeCurrentStart(scope, encounter),
      to: proposal.proposedStartAt,
    };
  }
  return { kind: "closed", to: proposal.proposedStartAt };
}

/** Why no new request can be sent; empty when one can. */
export type ScheduleChangeCreationBlock =
  | { readonly reason: "permission" | "rescheduling_disabled" }
  | { readonly reason: "active_request_exists" | "result_protected" }
  | { readonly reason: "limit_reached"; readonly teamId: string };

export function scheduleChangeCreationBlocks(
  creation: ScheduleChangeCreationOptionsDto,
): readonly ScheduleChangeCreationBlock[] {
  if (creation.blockedReason) return [{ reason: creation.blockedReason }];
  if (!creation.teams.some((team) => !team.blockedReason)) {
    return creation.teams.length > 0
      ? creation.teams.map((team) => ({ reason: "limit_reached", teamId: team.teamId }))
      : [{ reason: "permission" }];
  }
  if (!creation.scopes.some((option) => !option.blockedReason)) {
    return [
      ...new Set(creation.scopes.map((option) => option.blockedReason ?? "result_protected")),
    ].map((reason) => ({ reason }));
  }
  return [];
}

/** Response actions the reading actor may take now, in display order. */
export function offeredScheduleChangeResponses(
  request: ScheduleChangeRequestDto,
): readonly ScheduleChangeResponseAction[] {
  if (request.status !== "open") return [];
  return RESPONSE_ACTIONS.filter((action) => request.allowedActions.includes(action));
}

/** Distinct reasons a response is blocked, except the closed request its status already shows. */
export function blockedScheduleChangeReasons(request: ScheduleChangeRequestDto) {
  if (request.status !== "open") return [];
  return [...new Set(request.blockedActions.map((block) => block.reason))].filter(
    (reason) => reason !== "request_closed",
  );
}

/** The Team a counter-proposal answers as: the rival of the current proposal's Team. */
export function counterProposalTeamId(
  request: ScheduleChangeRequestDto,
  encounter: Pick<Encounter, "home" | "away">,
): string {
  const proposer = currentScheduleChangeProposal(request).proposedByTeamId;
  return proposer === encounter.home.teamId ? encounter.away.teamId : encounter.home.teamId;
}

/** An escalated request the reading actor (the organizer) may resolve. */
export function canResolveScheduleChange(request: ScheduleChangeRequestDto): boolean {
  return request.status === "escalated" && request.allowedActions.includes("resolve");
}

/** A draft opened against `target` no longer answers what the server holds. */
export function isScheduleChangeDraftStale(
  request: ScheduleChangeRequestDto,
  target: { readonly proposalId: string; readonly version: number },
  action: ScheduleChangeResponseAction,
): boolean {
  return (
    target.version !== request.version ||
    target.proposalId !== request.currentProposalId ||
    !request.allowedActions.includes(action)
  );
}

/** Message a client localizes after a failed command. */
export type ScheduleChangeRecoveryMessage =
  | "review"
  | "permission"
  | "activeRequest"
  | "windowClosed"
  | "resultProtected"
  | "disabled"
  | "limitReached"
  | "noticeCurrent"
  | "noticeProposed"
  | "acceptNotice"
  | "dateRejected"
  | "acceptPast"
  | "network"
  | "unknown";

/**
 * What a form does after a command fails. The list is reread either way: `close` drops the
 * draft and explains, `keep` leaves it (and its command key) for a retry.
 */
export interface ScheduleChangeRecovery {
  readonly draft: "close" | "keep";
  readonly field: "date" | null;
  readonly message: ScheduleChangeRecoveryMessage;
  /** The API code, when there was one. */
  readonly code: string | null;
}

type Rule = (
  command: ScheduleChangeCommandName,
  anchor: "current" | "proposed" | undefined,
) => Pick<ScheduleChangeRecovery, "draft" | "field" | "message">;

const close =
  (message: ScheduleChangeRecoveryMessage): Rule =>
  () => ({ draft: "close", field: null, message });
const hasDateField = (command: ScheduleChangeCommandName) =>
  command === "create" || command === "counter";

const RULES = new Map<string, Rule>([
  ["scheduling.schedule_change_version_conflict", close("review")],
  ["scheduling.schedule_change_concurrency_conflict", close("review")],
  ["scheduling.schedule_change_proposal_stale", close("review")],
  ["scheduling.schedule_change_request_closed", close("review")],
  ["scheduling.schedule_change_consent_already_recorded", close("review")],
  ["scheduling.active_schedule_change_request_exists", close("activeRequest")],
  ["scheduling.schedule_change_response_window_closed", close("windowClosed")],
  ["scheduling.encounter_not_editable_for_schedule_change", close("resultProtected")],
  ["scheduling.rescheduling_disabled", close("disabled")],
  ["scheduling.reschedule_limit_reached", close("limitReached")],
  ["scheduling.schedule_change_authority_not_required", close("permission")],
  ["scheduling.schedule_change_self_response_forbidden", close("permission")],
  ["authorization.forbidden", close("permission")],
  [
    "scheduling.reschedule_notice_not_met",
    (command, anchor) =>
      anchor === "current"
        ? { draft: "close", field: null, message: "noticeCurrent" }
        : hasDateField(command)
          ? { draft: "keep", field: "date", message: "noticeProposed" }
          : { draft: "close", field: null, message: "acceptNotice" },
  ],
  [
    "scheduling.invalid_schedule_change_date",
    (command) =>
      hasDateField(command)
        ? { draft: "keep", field: "date", message: "dateRejected" }
        : { draft: "close", field: null, message: "acceptPast" },
  ],
]);

/**
 * Same rules as web. `null` stands for a failure with no API answer, such as a dropped
 * connection.
 */
export function scheduleChangeRecovery(
  error: FutrobApiError | null,
  command: ScheduleChangeCommandName,
): ScheduleChangeRecovery {
  if (!error) {
    return { draft: "keep", field: null, message: "network", code: null };
  }
  const rule = RULES.get(error.code);
  if (rule) return { ...rule(command, error.details?.anchor), code: error.code };
  return { draft: "keep", field: null, message: "unknown", code: error.code };
}

/** Web's resolution form rule: any 409 means the request moved on; reread and review it. */
export function scheduleChangeResolutionFailure(
  error: FutrobApiError | null,
): Pick<ScheduleChangeRecovery, "message" | "code"> {
  if (!error) return { message: "network", code: null };
  return { message: error.status === 409 ? "review" : "unknown", code: error.code };
}
