import {
  asActorId,
  asOrganizationId,
  type ClockPort,
  type IdGeneratorPort,
} from "@futrob/shared-kernel";
import { ACTIVITY_STATUS, type ActivityEntry } from "../domain/entities/activity-entry.ts";
import type {
  ActivityEntryRepository,
  ActivityQuery,
  CloseActivityCommand,
} from "../domain/ports/activity-entry.repository.ts";
import { CloseActivityUseCase } from "./close-activity/close-activity.use-case.ts";
import { ListActivitiesUseCase } from "./list-activities/list-activities.use-case.ts";
import { RecordActivityUseCase } from "./record-activity/record-activity.use-case.ts";

/** Fake with the repository contract: unique per source and audience, first close wins. */
export class MemoryActivities implements ActivityEntryRepository {
  readonly rows: ActivityEntry[] = [];

  async insertIfAbsent(entries: readonly ActivityEntry[]): Promise<readonly ActivityEntry[]> {
    return entries.map((entry) => {
      const existing = this.rows.find(
        (row) =>
          row.sourceName === entry.sourceName &&
          row.sourceId === entry.sourceId &&
          row.audience === entry.audience &&
          row.audienceId === entry.audienceId,
      );
      if (existing) return existing;
      this.rows.push(entry);
      return entry;
    });
  }

  async close(command: CloseActivityCommand): Promise<number> {
    let closed = 0;
    this.rows.forEach((row, index) => {
      if (
        row.status !== ACTIVITY_STATUS.open ||
        row.sourceName !== command.source.name ||
        row.sourceId !== command.source.id ||
        (command.audience &&
          (row.audience !== command.audience.audience ||
            row.audienceId !== command.audience.audienceId))
      ) {
        return;
      }
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
    return this.rows
      .filter(
        (row) =>
          query.audiences.some(
            (ref) => ref.audience === row.audience && ref.audienceId === row.audienceId,
          ) &&
          (query.organizationId === undefined || row.organizationId === query.organizationId) &&
          (query.status === undefined || row.status === query.status) &&
          (query.requiresAction === undefined || row.requiresAction === query.requiresAction) &&
          (query.status !== ACTIVITY_STATUS.open ||
            row.expiresAt === null ||
            row.expiresAt.getTime() > query.now.getTime()) &&
          (!query.after ||
            row.lastEventAt.getTime() < query.after.lastEventAt.getTime() ||
            (row.lastEventAt.getTime() === query.after.lastEventAt.getTime() &&
              row.id < query.after.id)),
      )
      .sort(
        (left, right) =>
          right.lastEventAt.getTime() - left.lastEventAt.getTime() ||
          (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
      )
      .slice(0, query.limit);
  }
}

export class StepClock implements ClockPort {
  constructor(public current: Date) {}
  now(): Date {
    return this.current;
  }
}

export function sequentialIds(prefix = "act-row"): IdGeneratorPort {
  let next = 0;
  return { generate: () => `${prefix}-${String(++next).padStart(4, "0")}` };
}

export const ORG_A = asOrganizationId("org-a");
export const ORG_B = asOrganizationId("org-b");
export const OPENER = asActorId("act-opener");
export const OPERATOR = asActorId("act-operator");

export function at(time: string): Date {
  return new Date(`2026-10-07T${time}:00.000Z`);
}

export function activityHarness(start = at("08:00")) {
  const activities = new MemoryActivities();
  const clock = new StepClock(start);
  const ids = sequentialIds();
  return {
    activities,
    clock,
    record: new RecordActivityUseCase({ activities, clock, ids }),
    close: new CloseActivityUseCase({ activities, clock }),
    list: new ListActivitiesUseCase({ activities, clock }),
  };
}
