import type { ProviderMatchRepository } from "@futrob/game-data";
import type { ClockPort, TransactionPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import type { EncounterOpenSelectionPort } from "@futrob/scheduling";
import type { RunConfirmationExpiry } from "@/application/results/run-confirmation-expiry.ts";
import type { RunScheduleChangeExpiry } from "@/application/scheduling/run-schedule-change-expiry.ts";
import type { RecalculateRescheduledCandidates } from "@/application/results/recalculate-rescheduled-candidates.ts";
import type { GetEncounterViewUseCase } from "@/application/scheduling/get-encounter-view.use-case.ts";
import type { GetMyNextEncounterUseCase } from "@/application/scheduling/get-my-next-encounter.use-case.ts";
import type { ListCompetitionEncountersUseCase } from "@/application/scheduling/list-competition-encounters.use-case.ts";
import type { SwissRoundCommands } from "./swiss-round.commands.ts";
import type { GetCurrentCompetitionFixtureViewUseCase } from "@/application/scheduling/get-current-competition-fixture-view.use-case.ts";
import type { ListCompetitionDisputesQuery } from "@/application/results/list-competition-disputes.query.ts";
import type {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
} from "@/application/teams/team-roster-management.use-case.ts";
import type { CompetitionApplicationFlow } from "@/application/competitions/competition-application.flow.ts";
import type { EntryInvitationsComposition } from "./entry-invitations.composition.ts";
import type { SanctionsComposition } from "./sanctions.composition.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { GameDataModule } from "./game-data.module.ts";
import type { OnboardingCompletionFlow } from "@/application/identity/onboarding-completion.flow.ts";
import type { IdentityModule } from "./identity.module.ts";
import type { AccountDeletionComposition } from "./account-deletion.composition.ts";
import type { ListOrganizationMembersUseCase } from "@futrob/organizations";
import type { OrganizationsModule } from "./organizations.module.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";
import type { AuthorizationModule } from "./authorization.module.ts";
import type { withPlanUsage } from "./billing.module.ts";
import type {
  OfficialSelectionCommands,
  VoidOfficialResultAndUnproject,
} from "./official-selection.commands.ts";
import type { ResultsModule } from "./results.module.ts";
import type { ActivityCommands, NotificationsModule } from "./notifications.module.ts";
import type { PublicPortalModule } from "./public-portal.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";

import type { createOrganizationAudit } from "./organization-audit.composition.ts";

export interface AppModules {
  /** Account deletion by anonymization with every context's cleanup (ADR-0030). */
  readonly accountDeletion: AccountDeletionComposition;
  readonly audit: ReturnType<typeof createOrganizationAudit>;
  /** Commands of other contexts composed with their activity feed writes. */
  readonly activityCommands: ActivityCommands;
  readonly authorization: AuthorizationModule;
  readonly billing: ReturnType<typeof withPlanUsage>;
  readonly competitionApplications: CompetitionApplicationFlow;
  readonly competitions: CompetitionsModule;
  readonly entryInvitations: EntryInvitationsComposition;
  /** Impose and revoke with their table rebuild and activity in one transaction (ADR-0028). */
  readonly sanctions: SanctionsComposition;
  /** Every selection command composed with its transaction, lock and projection. */
  readonly officialSelection: OfficialSelectionCommands;
  /** Withdrawal and round closing composed with their transaction and locks (ADR-0027). */
  readonly swissRoundCommands: SwissRoundCommands;
  readonly runConfirmationExpiry: RunConfirmationExpiry;
  readonly runScheduleChangeExpiry: RunScheduleChangeExpiry;
  /** Consumes applied schedule changes; recovery is the Cron calling it again. */
  readonly recalculateRescheduledCandidates: RecalculateRescheduledCandidates;
  readonly voidOfficialResultAndUnproject: VoidOfficialResultAndUnproject;
  readonly getMyNextEncounter: GetMyNextEncounterUseCase;
  readonly getEncounterView: GetEncounterViewUseCase;
  readonly listCompetitionEncounters: ListCompetitionEncountersUseCase;
  readonly getCurrentCompetitionFixture: GetCurrentCompetitionFixtureViewUseCase;
  /** Operator queue of selections in `disputed` or `organizer_review`. */
  readonly listCompetitionDisputes: ListCompetitionDisputesQuery;
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly notifications: NotificationsModule;
  /** Finishes each onboarding path in one transaction that serializes per actor. */
  readonly onboardingCompletion: OnboardingCompletionFlow;
  readonly organizations: OrganizationsModule & {
    readonly listOrganizationMembers: ListOrganizationMembersUseCase;
  };
  readonly publicPortal: PublicPortalModule;
  readonly results: ResultsModule;
  readonly encounterOpenSelection: EncounterOpenSelectionPort;
  readonly scheduling: SchedulingModule;
  readonly statistics: StatisticsModule;
  readonly teams: TeamsModule;
  readonly teamManagement: {
    readonly list: ListTeamRosterManagementUseCase;
    readonly get: GetTeamRosterManagementUseCase;
  };
  readonly transaction: TransactionPort;
}

export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly pool: Pool | undefined;
  /** Test seam: observations the results module reads candidates from. */
  readonly providerMatches?: ProviderMatchRepository;
  readonly clock?: ClockPort;
  readonly resultsSystemActorId?: string;
  readonly schedulingSystemActorId?: string;
}
