import {
  CompetitionNotFound,
  type CompetitionDraft,
  type GetCompetitionDraftUseCase,
  type JoinCompetitionError,
  type JoinCompetitionUseCase,
} from "@futrob/competitions";
import {
  isProviderOutage,
  type ExternalClub,
  type GameDataProviderKey,
  type GetExternalClubInput,
  type GetExternalClubUseCase,
  type ProviderError,
} from "@futrob/game-data";
import type {
  CompleteOnboardingUseCase,
  OnboardingPath,
  OnboardingPathConflict,
} from "@futrob/identity";
import type {
  AcceptedInvitation,
  AcceptInvitationError,
  AcceptInvitationUseCase,
  CreateOrganizationError,
  CreateOrganizationResult,
  CreateOrganizationUseCase,
} from "@futrob/organizations";
import type {
  AddPlayerGameAccountError,
  AddPlayerGameAccountUseCase,
  AssociatePlayerExternalClubError,
  AssociatePlayerExternalClubUseCase,
  EnsurePlayerProfileUseCase,
  GamePlatform,
  GetPlayerProfileUseCase,
  PlayerExternalClubAssociation,
  PlayerGameAccount,
  PlayerProfile,
} from "@futrob/teams";
import { err, ok, type ActorId, type Result, type TransactionPort } from "@futrob/shared-kernel";
import { logCorrelatedInfo } from "@/context/request-correlation.ts";

export interface OnboardingGameAccountInput {
  readonly identifier: string;
  readonly platform: GamePlatform;
  readonly gameEdition: string;
}

export interface OnboardingPlayer {
  readonly profile: PlayerProfile;
  readonly gameAccount: PlayerGameAccount | null;
}

export type OrganizationCompletion = OnboardingPlayer & {
  readonly organization: CreateOrganizationResult;
};

export type InvitationCompletion = OnboardingPlayer & {
  readonly invitation: AcceptedInvitation;
  readonly competitionId: CompetitionDraft["competition"]["id"];
  readonly competitionName: string;
};

export type ExternalClubAssociationOutcome = "associated" | "skipped" | "failed";

export type PlayerCompletion = OnboardingPlayer & {
  readonly externalClubs: readonly PlayerExternalClubAssociation[];
  readonly externalClubAssociation: ExternalClubAssociationOutcome;
};

export type OnboardingCompletionError =
  | OnboardingPathConflict
  | CreateOrganizationError
  | AcceptInvitationError
  | JoinCompetitionError
  | AddPlayerGameAccountError
  | AssociatePlayerExternalClubError;

export type PlayerCompletionError = OnboardingCompletionError | ProviderError;

/**
 * Cross-BC flow that finishes onboarding for each path (AC-ONB-001). Every path runs in one
 * transaction that starts with `CompleteOnboardingUseCase.prepare`, which locks the actor's
 * onboarding and rejects a different completed path, so concurrent finishes serialize and a
 * loser leaves no side effects. Creation keys make a retried finish converge on the same
 * organization, profile and game account.
 */
export class OnboardingCompletionFlow {
  /** Takes the composed modules as they are; only the use cases below are reached. */
  constructor(
    private readonly modules: {
      readonly transaction: TransactionPort;
      readonly identity: { readonly completeOnboarding: CompleteOnboardingUseCase };
      readonly organizations: {
        readonly createOrganization: CreateOrganizationUseCase;
        readonly acceptInvitation: AcceptInvitationUseCase;
      };
      readonly competitions: {
        readonly getDraft: GetCompetitionDraftUseCase;
        readonly join: JoinCompetitionUseCase;
      };
      readonly teams: {
        readonly ensurePlayerProfile: EnsurePlayerProfileUseCase;
        readonly addPlayerGameAccount: AddPlayerGameAccountUseCase;
        readonly associatePlayerExternalClub: AssociatePlayerExternalClubUseCase;
        readonly getPlayerProfile: GetPlayerProfileUseCase;
      };
      readonly gameData: { readonly getExternalClub: GetExternalClubUseCase };
    },
  ) {}

  completeOrganization(input: {
    readonly actorId: ActorId;
    readonly name: string;
    readonly timeZone: string;
    readonly gameAccount: OnboardingGameAccountInput | null;
  }): Promise<Result<OrganizationCompletion, OnboardingCompletionError>> {
    const { actorId } = input;
    return this.inTransaction(actorId, "organization", async () => {
      const created = await this.modules.organizations.createOrganization.execute({
        name: input.name,
        actorId,
        timeZone: input.timeZone,
        creationKey: `onboarding:organization:${actorId}`,
      });
      if (!created.isOk()) return err(created.error);

      const player = await this.ensurePlayer(actorId, input.gameAccount);
      if (!player.isOk()) return err(player.error);

      return ok({ ...player.value, organization: created.value });
    });
  }

  completeInvitation(input: {
    readonly actorId: ActorId;
    readonly token: string;
    readonly gameAccount: OnboardingGameAccountInput | null;
  }): Promise<Result<InvitationCompletion, OnboardingCompletionError>> {
    const { actorId } = input;
    return this.inTransaction(actorId, "invitation", async () => {
      const accepted = await this.modules.organizations.acceptInvitation.execute({
        token: input.token,
        actorId,
        requireCompetition: true,
      });
      if (!accepted.isOk()) return err(accepted.error);

      const { organizationId } = accepted.value;
      const competitionId = accepted.value.competitionId!;
      const competition = await this.modules.competitions.getDraft.execute({
        organizationId,
        competitionId,
      });
      if (!competition) {
        return err(
          new CompetitionNotFound({
            code: "competitions.not_found",
            message: "Competition not found",
          }),
        );
      }
      const joined = await this.modules.competitions.join.execute({
        organizationId,
        competitionId,
        actorId,
        role: accepted.value.competitionRole!,
      });
      if (!joined.isOk()) return err(joined.error);

      const player = await this.ensurePlayer(actorId, input.gameAccount);
      if (!player.isOk()) return err(player.error);

      return ok({
        ...player.value,
        invitation: accepted.value,
        competitionId,
        competitionName: competition.competition.name,
      });
    });
  }

  /**
   * The club association is optional and declarative (no ownership check), so a provider
   * outage must not block onboarding: complete without the club and report `failed`.
   * A locator the provider rejects (club not found, unsupported) still fails the request.
   * The lookup runs before the transaction so no provider call holds the actor lock.
   */
  async completePlayer(input: {
    readonly actorId: ActorId;
    readonly gameAccount: OnboardingGameAccountInput | null;
    readonly externalClub:
      | (GetExternalClubInput & { readonly providerKey: GameDataProviderKey })
      | null;
  }): Promise<Result<PlayerCompletion, PlayerCompletionError>> {
    const { actorId, externalClub: locator } = input;
    if (locator) {
      const allowed = await this.modules.identity.completeOnboarding.check({
        actorId,
        path: "player",
      });
      if (!allowed.isOk()) return err(allowed.error);
    }
    let club: ExternalClub | null = null;
    let externalClubAssociation: ExternalClubAssociationOutcome = "skipped";
    if (locator) {
      const resolved = await this.modules.gameData.getExternalClub.execute(locator.providerKey, {
        externalClubId: locator.externalClubId,
        platform: locator.platform,
        gameEdition: locator.gameEdition,
      });
      if (resolved.isOk()) {
        club = resolved.value;
        externalClubAssociation = "associated";
      } else if (isProviderOutage(resolved.error)) {
        externalClubAssociation = "failed";
        logCorrelatedInfo("onboarding.player.external_club_skipped", {
          provider: locator.providerKey,
          code: resolved.error.code,
        });
      } else {
        return err(resolved.error);
      }
    }

    return this.inTransaction(actorId, "player", async () => {
      const player = await this.ensurePlayer(actorId, input.gameAccount);
      if (!player.isOk()) return err(player.error);

      if (club) {
        const associated = await this.modules.teams.associatePlayerExternalClub.execute({
          playerProfileId: player.value.profile.id,
          club,
        });
        if (!associated.isOk()) return err(associated.error);
      }
      const details = await this.modules.teams.getPlayerProfile.execute({ actorId });

      return ok({
        ...player.value,
        externalClubs: details.externalClubs,
        externalClubAssociation,
      });
    });
  }

  private async inTransaction<Value, Failure extends OnboardingCompletionError>(
    actorId: ActorId,
    path: OnboardingPath,
    run: () => Promise<Result<Value, Failure>>,
  ): Promise<Result<Value, Failure | OnboardingPathConflict>> {
    let failure: Failure | OnboardingPathConflict | undefined;
    try {
      return await this.modules.transaction.runInTransaction(async () => {
        const prepared = await this.modules.identity.completeOnboarding.prepare({ actorId, path });
        const result = prepared.isOk() ? await run() : err(prepared.error);
        if (!result.isOk()) {
          failure = result.error;
          // TransactionPort rolls back thrown failures, not Result.err values.
          throw failure;
        }
        await this.modules.identity.completeOnboarding.execute({ actorId, path });
        return result;
      });
    } catch (error) {
      if (failure && error === failure) return err(failure);
      throw error;
    }
  }

  private async ensurePlayer(
    actorId: ActorId,
    gameAccount: OnboardingGameAccountInput | null,
  ): Promise<Result<OnboardingPlayer, AddPlayerGameAccountError>> {
    const profile = await this.modules.teams.ensurePlayerProfile.execute({ actorId });
    if (!gameAccount) return ok({ profile, gameAccount: null });
    const added = await this.modules.teams.addPlayerGameAccount.execute({
      playerProfileId: profile.id,
      ...gameAccount,
    });
    return added.isOk() ? ok({ profile, gameAccount: added.value }) : err(added.error);
  }
}
