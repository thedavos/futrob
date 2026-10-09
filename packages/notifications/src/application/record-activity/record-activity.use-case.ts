import {
  err,
  ok,
  type ActorId,
  type ClockPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  ACTIVITY_AUDIENCE,
  ACTIVITY_STATUS,
  type ActivityAudience,
  type ActivityEntry,
  type ActivityKind,
  type ActivityResourceType,
  type ActivitySource,
  type ActivitySubject,
} from "../../domain/entities/activity-entry.ts";
import { InvalidActivity, type RecordActivityError } from "../../domain/errors/activity.errors.ts";
import type { ActivityEntryRepository } from "../../domain/ports/activity-entry.repository.ts";

export interface ActivityRecipient {
  readonly audience: ActivityAudience;
  readonly audienceId: string;
  readonly requiresAction: boolean;
}

export interface RecordActivityInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId | null;
  readonly kind: ActivityKind;
  readonly source: ActivitySource;
  readonly resource: { readonly type: ActivityResourceType; readonly id: string };
  readonly subject?: Partial<ActivitySubject>;
  readonly actorId: ActorId;
  /** When the fact happened; the clock when absent. */
  readonly occurredAt?: Date;
  /** A fact that is already over when it happens, such as a publication. */
  readonly bornClosed?: boolean;
  readonly expiresAt?: Date | null;
  readonly recipients: readonly ActivityRecipient[];
}

/**
 * Records one fact for each recipient. Recording the same source and audience again
 * returns the stored row, so a retried command never duplicates activity.
 */
export class RecordActivityUseCase {
  constructor(
    private readonly deps: {
      readonly activities: ActivityEntryRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: RecordActivityInput,
  ): Promise<Result<readonly ActivityEntry[], RecordActivityError>> {
    const invalid = validate(input);
    if (invalid)
      return err(new InvalidActivity({ code: "notifications.invalid_activity", message: invalid }));

    const openedAt = input.occurredAt ?? this.deps.clock.now();
    const closedAt = input.bornClosed ? openedAt : null;
    const subject: ActivitySubject = {
      competitionName: input.subject?.competitionName ?? null,
      encounterLabel: input.subject?.encounterLabel ?? null,
      teamName: input.subject?.teamName ?? null,
    };
    const entries = input.recipients.map(
      (recipient): ActivityEntry => ({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        audience: recipient.audience,
        audienceId: recipient.audienceId,
        kind: input.kind,
        status: closedAt ? ACTIVITY_STATUS.closed : ACTIVITY_STATUS.open,
        requiresAction: recipient.requiresAction,
        resourceType: input.resource.type,
        resourceId: input.resource.id,
        subject,
        actorId: input.actorId,
        closedByActorId: null,
        openedAt,
        closedAt,
        expiresAt: input.expiresAt ?? null,
        lastEventAt: openedAt,
        sourceName: input.source.name,
        sourceId: input.source.id,
      }),
    );
    return ok(await this.deps.activities.insertIfAbsent(entries));
  }
}

function validate(input: RecordActivityInput): string | null {
  if (input.recipients.length === 0) return "An activity needs at least one recipient";
  if (input.source.id.length === 0 || input.resource.id.length === 0) {
    return "An activity needs a source and a resource";
  }
  const seen = new Set<string>();
  for (const recipient of input.recipients) {
    if (recipient.audienceId.length === 0) return "A recipient needs an id";
    if (
      recipient.audience === ACTIVITY_AUDIENCE.organization &&
      recipient.audienceId !== input.organizationId
    ) {
      return "An organization recipient must be the organization of the activity";
    }
    if (input.bornClosed && recipient.requiresAction) {
      return "A fact born closed cannot require action";
    }
    const key = `${recipient.audience}:${recipient.audienceId}`;
    if (seen.has(key)) return "A recipient appears twice";
    seen.add(key);
  }
  return null;
}
