import type {
  AcceptRosterInvitationRequest,
  AcceptRosterInvitationResponse,
  AddMyPlayerGameAccountRequest,
  AddMyPlayerGameAccountResponse,
  AssociateMyPlayerExternalClubRequest,
  AssociateMyPlayerExternalClubResponse,
  GetMyPlayerProfileResponse,
  GetMyTeamsResponse,
  RequestId,
  SetActiveTeamRequest,
  SetActiveTeamResponse,
} from "@futrob/api-contracts";
import {
  playerGameAccountFixture,
  playerProfileFixture,
  playerTeamsFixture,
} from "./player-story-fixtures.ts";

/** Storybook-only client. Production code keeps `teams-browser-client.ts`. */
export class TeamsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "TeamsClientError";
  }
}

export type PlayerStoryQueryState<T> = "pending" | "error" | T;

export type PlayerStoryMutationState = "success" | "pending" | "error";

export type PlayerStoryState = {
  readonly profile: PlayerStoryQueryState<GetMyPlayerProfileResponse>;
  readonly teams: PlayerStoryQueryState<GetMyTeamsResponse>;
  readonly addGameAccount: PlayerStoryMutationState;
  readonly setActiveTeam: PlayerStoryMutationState;
  readonly acceptRosterInvitation: PlayerStoryMutationState;
};

const hang = <T>(): Promise<T> => new Promise(() => undefined);

const defaultState = (): PlayerStoryState => ({
  profile: playerProfileFixture(),
  teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
  addGameAccount: "success",
  setActiveTeam: "success",
  acceptRosterInvitation: "success",
});

let state: PlayerStoryState = defaultState();

export function configurePlayerStory(next: Partial<PlayerStoryState>): void {
  state = { ...defaultState(), ...next };
}

function rejectTeams<T>(code = "teams.unavailable"): Promise<T> {
  return Promise.reject(new TeamsClientError(503, code, "2170e2f6-a47e-4338-83c3-27c054630810"));
}

function resolveQuery<T>(value: PlayerStoryQueryState<T>): Promise<T> {
  if (value === "pending") return hang();
  if (value === "error") return rejectTeams();
  return Promise.resolve(value);
}

function resolveMutation<T>(kind: PlayerStoryMutationState, success: () => T): Promise<T> {
  switch (kind) {
    case "pending":
      return hang();
    case "error":
      return rejectTeams("teams.client_error");
    case "success":
      return Promise.resolve(success());
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export const teamsBrowserClient = {
  getMyProfile(): Promise<GetMyPlayerProfileResponse> {
    return resolveQuery(state.profile);
  },

  getMyTeams(): Promise<GetMyTeamsResponse> {
    return resolveQuery(state.teams);
  },

  addMyGameAccount(input: AddMyPlayerGameAccountRequest): Promise<AddMyPlayerGameAccountResponse> {
    return resolveMutation(state.addGameAccount, () => {
      const profile =
        state.profile === "pending" || state.profile === "error" ? null : state.profile;
      const current = profile ?? playerProfileFixture();
      const gameAccount = playerGameAccountFixture({
        id: `account-${input.identifier}`,
        identifier: input.identifier,
        platform: input.platform,
        gameEdition: input.gameEdition,
        providerExternalPlayerId: input.providerExternalPlayerId ?? null,
      });
      const nextProfile: GetMyPlayerProfileResponse = {
        ...current,
        profile: current.profile ?? { id: "profile-story", createdAt: "2026-08-01T00:00:00.000Z" },
        gameAccounts: [...current.gameAccounts, gameAccount],
      };
      state = { ...state, profile: nextProfile };
      const savedProfile = nextProfile.profile;
      if (!savedProfile) {
        throw new TeamsClientError(500, "teams.client_error");
      }
      return {
        profile: savedProfile,
        gameAccount,
      };
    });
  },

  associateMyExternalClub(
    input: AssociateMyPlayerExternalClubRequest,
  ): Promise<AssociateMyPlayerExternalClubResponse> {
    const profile = state.profile === "pending" || state.profile === "error" ? null : state.profile;
    const current = profile ?? playerProfileFixture();
    const nextProfile = current.profile ?? {
      id: "profile-story",
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    const externalClub = {
      playerProfileId: nextProfile.id,
      providerKey: input.providerKey,
      externalClubId: input.externalClubId,
      externalClubName: input.name,
      platform: input.platform,
      gameEdition: input.gameEdition,
      imageUrl: input.imageUrl,
      associatedAt: "2026-08-14T22:00:00.000Z",
    };
    state = {
      ...state,
      profile: {
        ...current,
        profile: nextProfile,
        externalClubs: [
          ...current.externalClubs.filter(
            (item) =>
              !(
                item.providerKey === externalClub.providerKey &&
                item.externalClubId === externalClub.externalClubId
              ),
          ),
          externalClub,
        ],
      },
    };
    return Promise.resolve({ profile: nextProfile, externalClub });
  },

  setActiveTeam(input: SetActiveTeamRequest): Promise<SetActiveTeamResponse> {
    return resolveMutation(state.setActiveTeam, () => {
      if (state.teams !== "pending" && state.teams !== "error") {
        state = {
          ...state,
          teams: {
            ...state.teams,
            activeRosterMembershipId: input.rosterMembershipId,
            teams: state.teams.teams.map((item) => ({
              ...item,
              active: item.membership.id === input.rosterMembershipId,
            })),
          },
        };
      }
      return {
        actorId: "actor-story",
        rosterMembershipId: input.rosterMembershipId,
        updatedAt: "2026-08-14T22:00:00.000Z",
      };
    });
  },

  acceptRosterInvitation(
    input: AcceptRosterInvitationRequest,
  ): Promise<AcceptRosterInvitationResponse> {
    return resolveMutation(state.acceptRosterInvitation, () => ({
      id: `membership-${input.token}`,
      organizationId: "org-liga-nocturna",
      competitionId: "copa-invierno",
      teamId: "team-fera",
      playerProfileId: "profile-story",
      gameAccountId: null,
      role: "player" as const,
      createdAt: "2026-08-14T22:00:00.000Z",
    }));
  },
};
