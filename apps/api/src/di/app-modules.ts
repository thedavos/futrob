import type { TransactionPort } from "@futrob/shared-kernel";
import type { RunConfirmationExpiry } from "@/application/results/run-confirmation-expiry.ts";
import type { RunScheduleChangeExpiry } from "@/application/scheduling/run-schedule-change-expiry.ts";
import type { RecalculateRescheduledCandidates } from "@/application/results/recalculate-rescheduled-candidates.ts";
import type { GetEncounterViewUseCase } from "@/application/scheduling/get-encounter-view.use-case.ts";
import type { GetMyNextEncounterUseCase } from "@/application/scheduling/get-my-next-encounter.use-case.ts";
import type { ListCompetitionEncountersUseCase } from "@/application/scheduling/list-competition-encounters.use-case.ts";
import type { GetCurrentCompetitionFixtureViewUseCase } from "@/application/scheduling/get-current-competition-fixture-view.use-case.ts";
import type {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
} from "@/application/teams/team-roster-management.use-case.ts";
import type { CompetitionApplicationFlow } from "@/application/competitions/competition-application.flow.ts";
import type { EntryInvitationsComposition } from "./entry-invitations.composition.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { GameDataModule } from "./game-data.module.ts";
import type { IdentityModule } from "./identity.module.ts";
import type { ListOrganizationMembersUseCase } from "@futrob/organizations";
import type { OrganizationsModule } from "./organizations.module.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";
import type { AuthorizationModule } from "./authorization.module.ts";
import type {
  OfficialSelectionCommands,
  VoidOfficialResultAndUnproject,
} from "./official-selection.commands.ts";
import type { ResultsModule } from "./results.module.ts";
import type { ActivityCommands, NotificationsModule } from "./notifications.module.ts";
import type { PublicPortalModule } from "./public-portal.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";

export interface AppModules {
  /** Commands of other contexts composed with their activity feed writes. */
  readonly activityCommands: ActivityCommands;
  readonly authorization: AuthorizationModule;
  readonly competitionApplications: CompetitionApplicationFlow;
  readonly competitions: CompetitionsModule;
  readonly entryInvitations: EntryInvitationsComposition;
  /** Every selection command composed with its transaction, lock and projection. */
  readonly officialSelection: OfficialSelectionCommands;
  readonly runConfirmationExpiry: RunConfirmationExpiry;
  readonly runScheduleChangeExpiry: RunScheduleChangeExpiry;
  /** Consumes applied schedule changes; recovery is the Cron calling it again. */
  readonly recalculateRescheduledCandidates: RecalculateRescheduledCandidates;
  readonly voidOfficialResultAndUnproject: VoidOfficialResultAndUnproject;
  readonly getMyNextEncounter: GetMyNextEncounterUseCase;
  readonly getEncounterView: GetEncounterViewUseCase;
  readonly listCompetitionEncounters: ListCompetitionEncountersUseCase;
  readonly getCurrentCompetitionFixture: GetCurrentCompetitionFixtureViewUseCase;
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly notifications: NotificationsModule;
  readonly organizations: OrganizationsModule & {
    readonly listOrganizationMembers: ListOrganizationMembersUseCase;
  };
  readonly publicPortal: PublicPortalModule;
  readonly results: ResultsModule;
  readonly scheduling: SchedulingModule;
  readonly statistics: StatisticsModule;
  readonly teams: TeamsModule;
  readonly teamManagement: {
    readonly list: ListTeamRosterManagementUseCase;
    readonly get: GetTeamRosterManagementUseCase;
  };
  readonly transaction: TransactionPort;
}
