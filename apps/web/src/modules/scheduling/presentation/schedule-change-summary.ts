import type { EncounterViewDto, ScheduleChangeRequestDto } from "@futrob/api-contracts";

/**
 * What the request's headline can truthfully say. The live schedule is the origin only while
 * the request is undecided; once applied, the stored application is the history, and a later
 * reschedule must not rewrite it.
 */
export type ScheduleChangeSummary =
  | { readonly kind: "pending"; readonly from: string; readonly to: string }
  | { readonly kind: "applied"; readonly from: string; readonly to: string }
  | { readonly kind: "closed"; readonly to: string };

/** Where the request's scope starts now, from the Encounter the hero and slots also show. */
export function currentStartOf(scope: ScheduleChangeRequestDto["scope"], view: EncounterViewDto) {
  return scope.type === "entire_encounter"
    ? view.scheduledStartAt
    : (view.officialMatches.find((match) => match.officialSlot === scope.officialSlot)
        ?.scheduledStartAt ?? view.scheduledStartAt);
}

export function scheduleChangeSummary(
  request: ScheduleChangeRequestDto,
  view: EncounterViewDto,
): ScheduleChangeSummary {
  const proposal = request.proposals.find((item) => item.id === request.currentProposalId)!;
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
    return { kind: "pending", from: currentStartOf(scope, view), to: proposal.proposedStartAt };
  }
  return { kind: "closed", to: proposal.proposedStartAt };
}
