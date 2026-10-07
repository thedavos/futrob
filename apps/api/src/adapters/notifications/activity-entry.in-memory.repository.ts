import {
  ACTIVITY_STATUS,
  type ActivityEntry,
  type ActivityEntryRepository,
  type ActivityQuery,
  type CloseActivityCommand,
} from "@futrob/notifications";

function sameKey(left: ActivityEntry, right: ActivityEntry): boolean {
  return (
    left.sourceName === right.sourceName &&
    left.sourceId === right.sourceId &&
    left.audience === right.audience &&
    left.audienceId === right.audienceId
  );
}

/** Ids compare by code unit, like `COLLATE "C"` in the Postgres adapter. */
function compareFeed(left: ActivityEntry, right: ActivityEntry): number {
  const time = right.lastEventAt.getTime() - left.lastEventAt.getTime();
  if (time !== 0) return time;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

/** Process-local store with the same contract as the Postgres adapter. */
export class InMemoryActivityEntryRepository implements ActivityEntryRepository {
  private readonly rows: ActivityEntry[] = [];

  async insertIfAbsent(entries: readonly ActivityEntry[]): Promise<readonly ActivityEntry[]> {
    return entries.map((entry) => {
      const existing = this.rows.find((row) => sameKey(row, entry));
      if (existing) return existing;
      this.rows.push(entry);
      return entry;
    });
  }

  async close(command: CloseActivityCommand): Promise<number> {
    let closed = 0;
    this.rows.forEach((row, index) => {
      const matches =
        row.status === ACTIVITY_STATUS.open &&
        row.sourceName === command.source.name &&
        row.sourceId === command.source.id &&
        (!command.audience ||
          (row.audience === command.audience.audience &&
            row.audienceId === command.audience.audienceId));
      if (!matches) return;
      this.rows[index] = {
        ...row,
        status: ACTIVITY_STATUS.closed,
        closedAt: command.closedAt,
        closedByActorId: command.closedByActorId,
        lastEventAt: command.closedAt,
      };
      closed += 1;
    });
    return closed;
  }

  async list(query: ActivityQuery): Promise<readonly ActivityEntry[]> {
    const after = query.after;
    return this.rows
      .filter((row) => {
        if (
          !query.audiences.some(
            (ref) =>
              ref.audience === row.audience &&
              ref.audienceId === row.audienceId &&
              (ref.competitionId === undefined || ref.competitionId === row.competitionId),
          )
        ) {
          return false;
        }
        if (query.organizationId !== undefined && row.organizationId !== query.organizationId) {
          return false;
        }
        if (query.competitionId !== undefined && row.competitionId !== query.competitionId) {
          return false;
        }
        if (query.status !== undefined && row.status !== query.status) return false;
        if (query.requiresAction !== undefined && row.requiresAction !== query.requiresAction) {
          return false;
        }
        if (
          query.status === ACTIVITY_STATUS.open &&
          row.expiresAt !== null &&
          row.expiresAt.getTime() <= query.now.getTime()
        ) {
          return false;
        }
        if (!after) return true;
        const time = row.lastEventAt.getTime() - after.lastEventAt.getTime();
        return time < 0 || (time === 0 && row.id < after.id);
      })
      .sort(compareFeed)
      .slice(0, query.limit);
  }
}
