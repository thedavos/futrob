import {
  CloseActivityUseCase,
  ListActivitiesUseCase,
  RecordActivityUseCase,
  type CloseActivityInput,
  type RecordActivityInput,
} from "@futrob/notifications";
import type { EncounterReaderPort } from "@futrob/results";
import type { ClockPort, IdGeneratorPort, TransactionPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { InMemoryActivityEntryRepository } from "@/adapters/notifications/activity-entry.in-memory.repository.ts";
import { PostgresActivityEntryRepository } from "@/adapters/notifications/activity-entry.repository.ts";
import {
  createActivityCommands,
  type ActivityCommands,
} from "@/application/notifications/activity-commands.ts";
import { SelectionActivityProjector } from "@/application/notifications/selection-activity.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export interface NotificationsModule {
  readonly recordActivity: RecordActivityUseCase;
  readonly closeActivity: CloseActivityUseCase;
  readonly listActivities: ListActivitiesUseCase;
  /**
   * Writers for compositions that run inside a command's transaction. An invalid
   * activity is a defect of the composition, so it throws and rolls the command back.
   */
  readonly writer: ActivityWriter;
}

export interface ActivityWriter {
  record(input: RecordActivityInput): Promise<void>;
  close(input: CloseActivityInput): Promise<void>;
}

export function createNotificationsModule(input: {
  readonly pool: Pool | undefined;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}): NotificationsModule {
  const activities = input.pool
    ? new PostgresActivityEntryRepository(input.pool)
    : new InMemoryActivityEntryRepository();
  const recordActivity = new RecordActivityUseCase({
    activities,
    clock: input.clock,
    ids: input.ids,
  });
  const closeActivity = new CloseActivityUseCase({ activities, clock: input.clock });
  return {
    recordActivity,
    closeActivity,
    listActivities: new ListActivitiesUseCase({ activities, clock: input.clock }),
    writer: {
      async record(activity) {
        const recorded = await recordActivity.execute(activity);
        if (!recorded.isOk()) throw recorded.error;
      },
      async close(activity) {
        await closeActivity.execute(activity);
      },
    },
  };
}

export interface ActivityFeed {
  readonly notifications: NotificationsModule;
  readonly selection: SelectionActivityProjector;
  readonly commands: ActivityCommands;
}

/**
 * The notifications module plus every composition that writes activity: the projector of
 * selection commands and the commands of other contexts wrapped with their activity.
 */
export function createActivityFeed(input: {
  readonly pool: Pool | undefined;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly transaction: TransactionPort;
  readonly encounterReader: EncounterReaderPort;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
}): ActivityFeed {
  const notifications = createNotificationsModule(input);
  const readers = {
    competitions: input.competitions.repository,
    teams: input.teams.repositories.teams,
  };
  return {
    notifications,
    selection: new SelectionActivityProjector({
      writer: notifications.writer,
      encounterReader: input.encounterReader,
      readers,
    }),
    commands: createActivityCommands({
      writer: notifications.writer,
      transaction: input.transaction,
      readers,
      competitions: input.competitions,
      teams: input.teams,
      invitations: input.teams.repositories.rosterInvitations,
      invitationTokens: input.teams.repositories.rosterInvitationTokens,
    }),
  };
}
