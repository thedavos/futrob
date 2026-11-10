import type {
  ActivityAudience,
  EmailAudienceIntent,
  EmailIntent,
  EmailNames,
  EnqueueEmailsInput,
  RecordActivityInput,
} from "@futrob/notifications";
import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/**
 * Web path of the call to action for an audience, the same page its activity row opens
 * (`apps/web/src/modules/notifications/presentation/activity-view.ts`).
 */
function pathFor(
  input: Pick<RecordActivityInput, "organizationId" | "competitionId" | "kind" | "resource">,
  audience: ActivityAudience,
): string {
  const competitionId = input.competitionId;
  if (!competitionId || audience === "actor") return "/";
  if (audience === "team") return `/player/competitions/${competitionId}/matches`;
  const base = `/orgs/${input.organizationId}/competitions/${competitionId}`;
  switch (input.kind) {
    case "match_dispute":
      return `${base}/disputes`;
    case "selection_confirmation":
    case "schedule_change":
      return `${base}/encounters`;
    case "organizer_decision":
      return input.resource.type === "encounter" ? `${base}/encounters` : `${base}/teams`;
    case "competition_entry":
    case "roster_invitation":
      return `${base}/teams`;
    case "competition_published":
    case "entry_invitation":
      return base;
  }
}

/** What each emailed kind says to one audience. `null`: the kind is web only. */
function intentFor(
  input: RecordActivityInput,
  requiresAction: boolean,
  path: string,
): EmailIntent | null {
  const names: EmailNames & { readonly path: string } = {
    path,
    competitionName: input.subject?.competitionName ?? null,
    encounterLabel: input.subject?.encounterLabel ?? null,
    teamName: input.subject?.teamName ?? null,
  };
  switch (input.kind) {
    case "competition_entry":
      return { ...names, template: "registration", requiresAction };
    case "schedule_change":
      return { ...names, template: "reschedule", requiresAction };
    case "selection_confirmation":
      return { ...names, template: "proposed_selection", requiresAction };
    case "match_dispute":
      return { ...names, template: "result_or_dispute", result: "disputed" };
    case "organizer_decision":
      return { ...names, template: "organizer_decision", outcome: input.subject?.outcome ?? null };
    case "roster_invitation":
    case "competition_published":
    case "entry_invitation":
      return null;
  }
}

/**
 * The email of an activity fact, or `null` when its kind is web only. One fact is one
 * `eventId`: its source. Audiences that must act come first, so an actor in two audiences
 * gets the email that asks them to act.
 */
export function activityEmail(input: RecordActivityInput): EnqueueEmailsInput | null {
  const audiences: EmailAudienceIntent[] = [];
  const ordered = [...input.recipients].sort(
    (left, right) => Number(right.requiresAction) - Number(left.requiresAction),
  );
  for (const recipient of ordered) {
    const intent = intentFor(input, recipient.requiresAction, pathFor(input, recipient.audience));
    if (!intent) return null;
    audiences.push({
      audience: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        audience: recipient.audience,
        audienceId: recipient.audienceId,
      },
      intent,
    });
  }
  return {
    eventId: `activity:${input.source.name}:${input.source.id}`,
    organizationId: input.organizationId,
    actorId: input.actorId,
    audiences,
  };
}

/** Both Teams of an Encounter learn that its result became official. */
export function officialResultEmail(input: {
  readonly officialResultId: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamIds: readonly TeamId[];
  readonly approvedBy: ActorId;
  readonly names: Pick<EmailNames, "competitionName" | "encounterLabel">;
}): EnqueueEmailsInput {
  return {
    eventId: `official_result:${input.officialResultId}`,
    organizationId: input.organizationId,
    actorId: input.approvedBy,
    audiences: input.teamIds.map((teamId) => ({
      audience: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        audience: "team",
        audienceId: teamId,
      },
      intent: {
        template: "result_or_dispute",
        result: "official",
        path: `/player/competitions/${input.competitionId}/matches`,
        competitionName: input.names.competitionName,
        encounterLabel: input.names.encounterLabel,
        teamName: null,
      },
    })),
  };
}
