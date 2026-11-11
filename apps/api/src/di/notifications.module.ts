import type { ResolveOrganizationEntitlementsUseCase } from "@futrob/billing";
import {
  CloseActivityUseCase,
  DispatchEmailsUseCase,
  EnqueueEmailsUseCase,
  GetEmailPreferencesUseCase,
  ListActivitiesUseCase,
  RecordActivityUseCase,
  SaveEmailPreferencesUseCase,
  UnsubscribeEmailUseCase,
  type CloseActivityInput,
  type EmailContactsPort,
  type EmailOutboxRepository,
  type EmailSenderPort,
  type EnqueueEmailsInput,
  type RecordActivityInput,
} from "@futrob/notifications";
import type { MembershipRepository } from "@futrob/organizations";
import type { EncounterReaderPort } from "@futrob/results";
import type { CompetitionRosterMembershipRepository, PlayerProfileRepository } from "@futrob/teams";
import type {
  AuthorizationPort,
  ClockPort,
  IdGeneratorPort,
  TransactionPort,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { InMemoryActivityEntryRepository } from "@/adapters/notifications/activity-entry.in-memory.repository.ts";
import { PostgresActivityEntryRepository } from "@/adapters/notifications/activity-entry.repository.ts";
import {
  ActivityAudienceEmailRecipients,
  BillingEmailChannelAccess,
} from "@/adapters/notifications/email-audience.bridges.ts";
import { InMemoryEmailOutboxRepository } from "@/adapters/notifications/email-outbox.in-memory.repository.ts";
import { PostgresEmailOutboxRepository } from "@/adapters/notifications/email-outbox.repository.ts";
import {
  InMemoryEmailPreferencesRepository,
  PostgresEmailPreferencesRepository,
} from "@/adapters/notifications/email-preferences.repository.ts";
import { InMemoryEmailSender } from "@/adapters/notifications/in-memory-email-sender.ts";
import { activityEmail } from "@/application/notifications/activity-email.ts";
import {
  createActivityCommands,
  type ActivityCommands as BaseActivityCommands,
} from "@/application/notifications/activity-commands.ts";
import {
  CompetitionEntryActivity,
  createCompetitionEntryCommands,
  type CompetitionEntryCommands,
} from "@/application/notifications/competition-entry-activity.ts";
import {
  createScheduleChangeCommands,
  ScheduleChangeActivity,
  type ScheduleChangeCommands,
} from "@/application/notifications/schedule-change-activity.ts";
import { SelectionActivityProjector } from "@/application/notifications/selection-activity.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export interface NotificationsModule {
  readonly recordActivity: RecordActivityUseCase;
  readonly closeActivity: CloseActivityUseCase;
  readonly listActivities: ListActivitiesUseCase;
  readonly email: EmailChannel;
  /**
   * Writers for compositions that run inside a command's transaction. An invalid
   * activity is a defect of the composition, so it throws and rolls the command back.
   */
  readonly writer: ActivityWriter;
}

export interface ActivityWriter {
  /** Records the fact in the feed and queues its email in the same transaction. */
  record(input: RecordActivityInput): Promise<void>;
  close(input: CloseActivityInput): Promise<void>;
  /** Queues the email of a fact that has no feed row, such as an official result. */
  email(input: EnqueueEmailsInput): Promise<void>;
}

/** Email channel (ADR-0008, ADR-0029): queued by commands, sent by the dispatch runner. */
export interface EmailChannel {
  readonly outbox: EmailOutboxRepository;
  /** `null` without a provider: queued email stays pending until one is configured. */
  readonly dispatch: DispatchEmailsUseCase | null;
  readonly getPreferences: GetEmailPreferencesUseCase;
  readonly savePreferences: SaveEmailPreferencesUseCase;
  readonly unsubscribe: UnsubscribeEmailUseCase;
}

/** Where email comes from and where its links lead. */
export interface EmailSettings {
  /**
   * Provider adapter. `"memory"` keeps every email in the process (local and tests);
   * `null` means no provider is configured, so nothing is sent or settled.
   */
  readonly sender: EmailSenderPort | "memory" | null;
  /** Web origin of calls to action and the unsubscribe page, such as `https://futrob.app`. */
  readonly webBaseUrl: string;
}

/** Local and test default: every email stays in memory, links point at the local web. */
export const LOCAL_EMAIL_SETTINGS: EmailSettings = {
  sender: "memory",
  webBaseUrl: "http://localhost:3000",
};

export interface EmailSources {
  readonly memberships: MembershipRepository;
  readonly rosters: CompetitionRosterMembershipRepository;
  readonly profiles: PlayerProfileRepository;
  readonly contacts: EmailContactsPort;
  readonly entitlements: ResolveOrganizationEntitlementsUseCase;
  readonly authorization: AuthorizationPort;
}

export function createNotificationsModule(input: {
  readonly pool: Pool | undefined;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly email: EmailSettings;
  readonly sources: EmailSources;
}): NotificationsModule {
  const activities = input.pool
    ? new PostgresActivityEntryRepository(input.pool)
    : new InMemoryActivityEntryRepository();
  const outbox = input.pool
    ? new PostgresEmailOutboxRepository(input.pool)
    : new InMemoryEmailOutboxRepository();
  const preferences = input.pool
    ? new PostgresEmailPreferencesRepository(input.pool)
    : new InMemoryEmailPreferencesRepository();
  const enqueueEmails = new EnqueueEmailsUseCase({
    outbox,
    recipients: new ActivityAudienceEmailRecipients(input.sources),
    clock: input.clock,
    ids: input.ids,
  });
  const webBaseUrl = input.email.webBaseUrl.replace(/\/+$/, "");
  const preferenceDeps = { preferences, clock: input.clock, ids: input.ids };
  const email: EmailChannel = {
    outbox,
    dispatch:
      input.email.sender &&
      new DispatchEmailsUseCase({
        outbox,
        sender: input.email.sender === "memory" ? new InMemoryEmailSender() : input.email.sender,
        contacts: input.sources.contacts,
        preferences,
        channelAccess: new BillingEmailChannelAccess(input.sources.entitlements),
        links: {
          webBaseUrl,
          unsubscribeUrl: (token) =>
            `${webBaseUrl}/email/unsubscribe?token=${encodeURIComponent(token)}`,
          oneClickUnsubscribeUrl: (token) =>
            `${webBaseUrl}/api/v1/public/email/unsubscribe?token=${encodeURIComponent(token)}`,
        },
        clock: input.clock,
        ids: input.ids,
      }),
    getPreferences: new GetEmailPreferencesUseCase(preferenceDeps),
    savePreferences: new SaveEmailPreferencesUseCase(preferenceDeps),
    unsubscribe: new UnsubscribeEmailUseCase(preferenceDeps),
  };
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
    email,
    writer: {
      async record(activity) {
        const recorded = await recordActivity.execute(activity);
        if (!recorded.isOk()) throw recorded.error;
        const queued = activityEmail(activity);
        if (queued) await enqueueEmails.execute(queued);
      },
      async close(activity) {
        await closeActivity.execute(activity);
      },
      async email(fact) {
        await enqueueEmails.execute(fact);
      },
    },
  };
}

/** Every command of another context that writes activity in its own transaction. */
export type ActivityCommands = BaseActivityCommands &
  CompetitionEntryCommands &
  ScheduleChangeCommands;

export interface ActivityFeed {
  readonly notifications: NotificationsModule;
  readonly selection: SelectionActivityProjector;
  /** Entries recorded by the flows that create them outside a single command. */
  readonly entries: CompetitionEntryActivity;
  readonly commands: ActivityCommands;
}

export type ActivityEmailSources = Pick<
  EmailSources,
  "memberships" | "contacts" | "entitlements" | "authorization"
>;

/** Picks the email sources the activity feed needs from the composed modules. */
export function activityEmailSources(modules: {
  readonly organizations: { readonly repositories: { readonly memberships: MembershipRepository } };
  readonly identity: { readonly contacts: EmailContactsPort };
  readonly billing: {
    readonly useCases: {
      readonly resolveOrganizationEntitlements: ResolveOrganizationEntitlementsUseCase;
    };
  };
  readonly authorization: { readonly port: AuthorizationPort };
}): ActivityEmailSources {
  return {
    memberships: modules.organizations.repositories.memberships,
    contacts: modules.identity.contacts,
    entitlements: modules.billing.useCases.resolveOrganizationEntitlements,
    authorization: modules.authorization.port,
  };
}

/**
 * The notifications module plus every composition that writes activity: the projector of
 * selection commands and the commands of other contexts wrapped with their activity.
 */
export function createActivityFeed(input: {
  readonly pool: Pool | undefined;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
  readonly email?: EmailSettings;
  readonly sources: ActivityEmailSources;
  readonly transaction: TransactionPort;
  readonly encounterReader: EncounterReaderPort;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
  readonly scheduling: SchedulingModule;
}): ActivityFeed {
  const notifications = createNotificationsModule({
    ...input,
    email: input.email ?? LOCAL_EMAIL_SETTINGS,
    sources: {
      ...input.sources,
      rosters: input.teams.repositories.rosters,
      profiles: input.teams.repositories.profiles,
    },
  });
  const readers = {
    competitions: input.competitions.repository,
    teams: input.teams.repositories.teams,
  };
  const entries = new CompetitionEntryActivity({ writer: notifications.writer, readers });
  const scheduleChanges = new ScheduleChangeActivity({
    writer: notifications.writer,
    readers,
    encounters: input.scheduling.encounters,
    rules: input.scheduling.rescheduleRules,
  });
  const { competitions, scheduling } = input;
  return {
    notifications,
    entries,
    selection: new SelectionActivityProjector({
      writer: notifications.writer,
      encounterReader: input.encounterReader,
      readers,
    }),
    commands: {
      ...createCompetitionEntryCommands({
        transaction: input.transaction,
        activity: entries,
        register: competitions.registerTeamEntry,
        approve: competitions.approveTeamEntry,
        reject: competitions.rejectTeamEntry,
      }),
      ...createScheduleChangeCommands({
        transaction: input.transaction,
        activity: scheduleChanges,
        requests: scheduling.scheduleChangeRequests,
        create: scheduling.createScheduleChangeRequest,
        accept: scheduling.acceptScheduleChangeProposal,
        reject: scheduling.rejectScheduleChangeProposal,
        counter: scheduling.counterScheduleChangeProposal,
        resolve: scheduling.resolveScheduleChangeRequest,
        expire: scheduling.expireScheduleChangeProposal,
      }),
      ...createActivityCommands({
        writer: notifications.writer,
        transaction: input.transaction,
        readers,
        competitions: input.competitions,
        teams: input.teams,
        invitations: input.teams.repositories.rosterInvitations,
        invitationTokens: input.teams.repositories.rosterInvitationTokens,
      }),
    },
  };
}
