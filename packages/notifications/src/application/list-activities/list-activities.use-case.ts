import {
  err,
  ok,
  type ClockPort,
  type OrganizationId,
  type Page,
  type Result,
} from "@futrob/shared-kernel";
import type {
  ActivityAudienceRef,
  ActivityEntry,
  ActivityStatus,
} from "../../domain/entities/activity-entry.ts";
import {
  InvalidActivity,
  InvalidActivityCursor,
  type ListActivitiesError,
} from "../../domain/errors/activity.errors.ts";
import type {
  ActivityEntryRepository,
  ActivityPosition,
} from "../../domain/ports/activity-entry.repository.ts";

export const ACTIVITY_PAGE_SIZE = { default: 25, max: 50 } as const;

export interface ListActivitiesInput {
  /** Already authorized by the caller. An empty list yields an empty page. */
  readonly audiences: readonly ActivityAudienceRef[];
  readonly organizationId?: OrganizationId;
  readonly status?: ActivityStatus;
  readonly requiresAction?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * Reads a feed newest first. Pending lists ask for `status: open` and
 * `requiresAction: true`; expired open rows are left out of them.
 */
export class ListActivitiesUseCase {
  constructor(
    private readonly deps: {
      readonly activities: ActivityEntryRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ListActivitiesInput,
  ): Promise<Result<Page<ActivityEntry>, ListActivitiesError>> {
    const limit = input.limit ?? ACTIVITY_PAGE_SIZE.default;
    if (!Number.isInteger(limit) || limit < 1 || limit > ACTIVITY_PAGE_SIZE.max) {
      return err(
        new InvalidActivity({
          code: "notifications.invalid_activity",
          message: `limit must be between 1 and ${ACTIVITY_PAGE_SIZE.max}`,
        }),
      );
    }
    let after: ActivityPosition | undefined;
    if (input.cursor !== undefined) {
      const decoded = decodeActivityCursor(input.cursor);
      if (!decoded) {
        return err(
          new InvalidActivityCursor({
            code: "notifications.invalid_cursor",
            message: "Invalid activity cursor",
          }),
        );
      }
      after = decoded;
    }
    if (input.audiences.length === 0) return ok({ items: [] });

    const rows = await this.deps.activities.list({
      audiences: input.audiences,
      organizationId: input.organizationId,
      status: input.status,
      requiresAction: input.requiresAction,
      now: this.deps.clock.now(),
      after,
      limit: limit + 1,
    });
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return ok(
      rows.length > limit && last ? { items, nextCursor: encodeActivityCursor(last) } : { items },
    );
  }
}

export function encodeActivityCursor(position: ActivityPosition): string {
  return `${position.lastEventAt.getTime()}.${position.id}`;
}

export function decodeActivityCursor(cursor: string): ActivityPosition | null {
  const match = /^(\d{1,15})\.(.+)$/.exec(cursor);
  if (!match?.[1] || !match[2]) return null;
  return { lastEventAt: new Date(Number(match[1])), id: match[2] };
}
