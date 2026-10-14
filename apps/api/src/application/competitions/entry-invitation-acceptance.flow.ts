import type {
  CompetitionDraft,
  CompetitionEntry,
  CompetitionEntryRepository,
  EntryInvitation,
  EntryInvitationAlreadyDecided,
  EntryInvitationReference,
  RecordEntryInvitationAcceptanceUseCase,
  RegisterInvitedEntryError,
  RegisterInvitedEntryUseCase,
  ResolveEntryInvitationError,
  ResolveEntryInvitationUseCase,
} from "@futrob/competitions";
import type { OrganizationRepository } from "@futrob/organizations";
import {
  RosterCompetitionConflict,
  type AddToRosterUncheckedError,
  type ClaimApplicantCaptaincyUseCase,
  type CompetitionRosterMembershipRepository,
  type CreateApplicantTeamError,
  type CreateApplicantTeamUseCase,
  type PlayerExternalClubAssociationRepository,
  type PlayerProfileRepository,
  type Team,
  type TeamRepository,
} from "@futrob/teams";
import {
  err,
  ok,
  type ActorId,
  type CompetitionId,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";

export interface InvitedTeam {
  readonly entry: CompetitionEntry;
  readonly team: Team;
}

export interface EntryInvitationPreview {
  readonly invitation: EntryInvitation;
  readonly competition: CompetitionDraft;
  readonly organizationName: string;
  /** The club the actor declared, offered as the team name. */
  readonly suggestedTeamName: string | null;
  /** The team the actor already has in this competition, if any. */
  readonly existing: InvitedTeam | null;
}

export type AcceptEntryInvitationError =
  | ResolveEntryInvitationError
  | RegisterInvitedEntryError
  | CreateApplicantTeamError
  | AddToRosterUncheckedError
  | RosterCompetitionConflict
  | EntryInvitationAlreadyDecided;

/**
 * Cross-BC flow (competitions + teams) that turns an accepted entry invitation into a
 * team (ADR-0023). Same order and idempotency as `CompetitionApplicationFlow`:
 *   1. read-only: the actor may use the invitation and has no team in the competition;
 *   2. Team in the host organization (`<key>:team`);
 *   3. approved CompetitionEntry within capacity (`<key>:entry`);
 *   4. the actor as captain of that Team's roster;
 *   5. a directed invitation closes as accepted with the entry, and so does its activity.
 */
export class EntryInvitationAcceptanceFlow {
  constructor(
    private readonly deps: {
      readonly transaction: TransactionPort;
      readonly resolve: ResolveEntryInvitationUseCase;
      readonly registerEntry: RegisterInvitedEntryUseCase;
      readonly recordAcceptance: RecordEntryInvitationAcceptanceUseCase;
      readonly createApplicantTeam: CreateApplicantTeamUseCase;
      readonly claimCaptaincy: ClaimApplicantCaptaincyUseCase;
      readonly organizations: OrganizationRepository;
      readonly entries: CompetitionEntryRepository;
      readonly teams: TeamRepository;
      readonly profiles: PlayerProfileRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly clubs: PlayerExternalClubAssociationRepository;
      /** Closes the invited player's pending activity in the same transaction. */
      readonly activity: {
        answered(invitation: EntryInvitation, actorId: ActorId): Promise<void>;
      };
    },
  ) {}

  async preview(input: {
    readonly actorId: ActorId;
    readonly reference: EntryInvitationReference;
  }): Promise<Result<EntryInvitationPreview, ResolveEntryInvitationError>> {
    const resolved = await this.deps.resolve.execute(input);
    if (!resolved.isOk()) return err(resolved.error);
    const { invitation, competition } = resolved.value;
    const [organization, existing, suggestedTeamName] = await Promise.all([
      this.deps.organizations.getById(invitation.organizationId),
      this.mine({ actorId: input.actorId, competitionId: invitation.competitionId }),
      this.declaredClubName(input.actorId),
    ]);
    return ok({
      invitation,
      competition,
      organizationName: organization?.name ?? "",
      suggestedTeamName,
      existing,
    });
  }

  async accept(input: {
    readonly actorId: ActorId;
    readonly reference: EntryInvitationReference;
    readonly teamName: string;
    readonly creationKey: string;
  }): Promise<Result<InvitedTeam, AcceptEntryInvitationError>> {
    let failure: AcceptEntryInvitationError | undefined;
    try {
      return await this.deps.transaction.runInTransaction(async () => {
        const result = await this.acceptUnchecked(input);
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

  private async acceptUnchecked(input: {
    readonly actorId: ActorId;
    readonly reference: EntryInvitationReference;
    readonly teamName: string;
    readonly creationKey: string;
  }): Promise<Result<InvitedTeam, AcceptEntryInvitationError>> {
    const resolved = await this.deps.resolve.execute(input);
    if (!resolved.isOk()) return err(resolved.error);
    const { invitation } = resolved.value;
    const { organizationId, competitionId } = invitation;

    const teamKey = `${input.creationKey}:team`;
    const existing = await this.mine({ actorId: input.actorId, competitionId });
    if (existing) {
      const sameAcceptance =
        existing.team.creationKey === teamKey ||
        (invitation.acceptedEntryId !== null && existing.entry.id === invitation.acceptedEntryId);
      if (sameAcceptance) return ok(existing);
      return err(
        new RosterCompetitionConflict({
          code: "teams.roster_competition_conflict",
          message: "Player already belongs to a team in this competition",
        }),
      );
    }

    const team = await this.deps.createApplicantTeam.execute({
      organizationId,
      actorId: input.actorId,
      name: input.teamName,
      creationKey: teamKey,
    });
    if (!team.isOk()) return err(team.error);

    const entry = await this.deps.registerEntry.execute({
      organizationId,
      competitionId,
      teamId: team.value.id,
      creationKey: `${input.creationKey}:entry`,
    });
    if (!entry.isOk()) return err(entry.error);

    const captain = await this.deps.claimCaptaincy.execute({
      actorId: input.actorId,
      organizationId,
      competitionId,
      teamId: team.value.id,
    });
    if (!captain.isOk()) return err(captain.error);

    const recorded = await this.deps.recordAcceptance.execute({
      invitation,
      entryId: entry.value.id,
    });
    if (!recorded.isOk()) return err(recorded.error);
    await this.deps.activity.answered(recorded.value, input.actorId);

    return ok({ entry: entry.value, team: team.value });
  }

  /** The actor's own team in a competition, derived from their roster membership. */
  private async mine(input: {
    readonly actorId: ActorId;
    readonly competitionId: CompetitionId;
  }): Promise<InvitedTeam | null> {
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

  private async declaredClubName(actorId: ActorId): Promise<string | null> {
    const profile = await this.deps.profiles.findByActor(actorId);
    if (!profile) return null;
    const [club] = await this.deps.clubs.listByPlayerProfile(profile.id);
    return club?.externalClubName ?? null;
  }
}
