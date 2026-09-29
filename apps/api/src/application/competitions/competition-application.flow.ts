import type {
  ApplyToCompetitionError,
  ApplyToCompetitionUseCase,
  CompetitionEntry,
  CompetitionEntryRepository,
  GetDiscoverableCompetitionError,
  GetDiscoverableCompetitionUseCase,
} from "@futrob/competitions";
import {
  RosterCompetitionConflict,
  type ClaimApplicantCaptaincyUseCase,
  type CompetitionRosterMembershipRepository,
  type CreateApplicantTeamError,
  type CreateApplicantTeamUseCase,
  type PlayerProfileRepository,
  type Team,
  type TeamRepository,
  type AddToRosterUncheckedError,
} from "@futrob/teams";
import {
  err,
  ok,
  type ActorId,
  type CompetitionId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";

export interface CompetitionApplicationInput {
  readonly actorId: ActorId;
  readonly competitionId: CompetitionId;
  readonly teamName: string;
  readonly creationKey: string;
}

export interface CompetitionApplication {
  readonly entry: CompetitionEntry;
  readonly team: Team;
}

export type ApplyToCompetitionFlowError =
  | GetDiscoverableCompetitionError
  | ApplyToCompetitionError
  | CreateApplicantTeamError
  | AddToRosterUncheckedError;

/**
 * Cross-BC flow (competitions + teams) for self-service applications. Order keeps every
 * step idempotent under the client `creationKey`, so a retry heals a partial failure:
 *   1. read-only guards: discoverable; a retry returns the existing application; then
 *      `registration` with free capacity;
 *   2. applicant Team in the host organization;
 *   3. `pending` CompetitionEntry (the roster entry gate requires it);
 *   4. actor as captain of that Team's roster.
 */
export class CompetitionApplicationFlow {
  constructor(
    private readonly deps: {
      readonly transaction: TransactionPort;
      readonly getDiscoverable: GetDiscoverableCompetitionUseCase;
      readonly apply: ApplyToCompetitionUseCase;
      readonly createApplicantTeam: CreateApplicantTeamUseCase;
      readonly claimCaptaincy: ClaimApplicantCaptaincyUseCase;
      readonly entries: CompetitionEntryRepository;
      readonly teams: TeamRepository;
      readonly profiles: PlayerProfileRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
    },
  ) {}

  async apply(
    input: CompetitionApplicationInput,
  ): Promise<Result<CompetitionApplication, ApplyToCompetitionFlowError>> {
    let failure: ApplyToCompetitionFlowError | undefined;
    try {
      return await this.deps.transaction.runInTransaction(async () => {
        const result = await this.applyUnchecked(input);
        if (!result.isOk()) {
          failure = result.error;
          // TransactionPort rolls back thrown failures, not Result.err values.
          throw failure;
        }
        return result;
      });
    } catch (error) {
      if (failure && error === failure) return err(failure);
      throw error;
    }
  }

  private async applyUnchecked(
    input: CompetitionApplicationInput,
  ): Promise<Result<CompetitionApplication, ApplyToCompetitionFlowError>> {
    const discoverable = await this.deps.getDiscoverable.execute({
      competitionId: input.competitionId,
    });
    if (!discoverable.isOk()) return err(discoverable.error);
    const organizationId = discoverable.value.competition.organizationId;

    const teamKey = `${input.creationKey}:team`;
    const existing = await this.mine({
      actorId: input.actorId,
      competitionId: input.competitionId,
    });
    if (existing) {
      if (existing.team.creationKey === teamKey) return ok(existing);
      return err(
        new RosterCompetitionConflict({
          code: "teams.roster_competition_conflict",
          message: "Player already belongs to a team in this competition",
        }),
      );
    }

    const accepting = await this.deps.apply.ensureAcceptingApplications(
      organizationId,
      input.competitionId,
    );
    if (!accepting.isOk()) return err(accepting.error);

    const team = await this.deps.createApplicantTeam.execute({
      organizationId,
      actorId: input.actorId,
      name: input.teamName,
      creationKey: teamKey,
    });
    if (!team.isOk()) return err(team.error);

    const entry = await this.deps.apply.execute({
      organizationId,
      competitionId: input.competitionId,
      teamId: team.value.id,
      creationKey: `${input.creationKey}:entry`,
    });
    if (!entry.isOk()) return err(entry.error);

    const captain = await this.deps.claimCaptaincy.execute({
      actorId: input.actorId,
      organizationId,
      competitionId: input.competitionId,
      teamId: team.value.id,
    });
    if (!captain.isOk()) return err(captain.error);

    return ok({ entry: entry.value, team: team.value });
  }

  /** The actor's own entry in a competition, derived from their roster membership. */
  async mine(input: {
    readonly actorId: ActorId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionApplication | null> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    if (!profile) return null;
    const roster = await this.deps.rosters.findByPlayerAndCompetition(
      profile.id,
      input.competitionId,
    );
    if (!roster) return null;
    const [entry, team] = await Promise.all([
      this.deps.entries.findByCompetitionAndTeam(
        roster.organizationId,
        roster.competitionId,
        roster.teamId,
      ),
      this.deps.teams.findById(roster.organizationId, roster.teamId),
    ]);
    return entry && team ? { entry, team } : null;
  }
}
