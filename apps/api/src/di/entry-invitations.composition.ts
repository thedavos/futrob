import type { OrganizationRepository } from "@futrob/organizations";
import type { TransactionPort } from "@futrob/shared-kernel";
import { EntryInvitationAcceptanceFlow } from "@/application/competitions/entry-invitation-acceptance.flow.ts";
import type { ActivitySubjectReaders } from "@/application/notifications/activity-subjects.ts";
import {
  createEntryInvitationCommands,
  EntryInvitationActivity,
  type EntryInvitationCommands,
} from "@/application/notifications/entry-invitation-activity.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { ActivityWriter } from "./notifications.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export interface EntryInvitationsComposition {
  /** Invite, revoke and decline, each with its activity in one transaction. */
  readonly commands: EntryInvitationCommands;
  readonly acceptance: EntryInvitationAcceptanceFlow;
}

/** Entry invitations (ADR-0023): competitions + teams + activity of the invited player. */
export function createEntryInvitations(input: {
  readonly transaction: TransactionPort;
  readonly writer: ActivityWriter;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
  readonly organizations: OrganizationRepository;
}): EntryInvitationsComposition {
  const invitations = input.competitions.entryInvitations;
  const readers: ActivitySubjectReaders = {
    competitions: input.competitions.repository,
    teams: input.teams.repositories.teams,
  };
  const activity = new EntryInvitationActivity({ writer: input.writer, readers });
  return {
    commands: createEntryInvitationCommands({
      transaction: input.transaction,
      activity,
      invite: invitations.invite,
      revoke: invitations.revoke,
      decline: invitations.decline,
    }),
    acceptance: new EntryInvitationAcceptanceFlow({
      transaction: input.transaction,
      resolve: invitations.resolve,
      registerEntry: invitations.registerEntry,
      recordAcceptance: invitations.recordAcceptance,
      createApplicantTeam: input.teams.createApplicantTeam,
      claimCaptaincy: input.teams.claimApplicantCaptaincy,
      organizations: input.organizations,
      entries: input.competitions.entryRepository,
      teams: input.teams.repositories.teams,
      profiles: input.teams.repositories.profiles,
      rosters: input.teams.repositories.rosters,
      clubs: input.teams.repositories.associations,
      activity,
    }),
  };
}
