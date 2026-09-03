import type {
  AcceptCompetitionInvitationResponse,
  AcceptInvitationRequest,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ListMyMembershipsResponse,
  PostAuthDestinationDto,
  RequestId,
  ResolvePostAuthDestinationResponse,
} from "@futrob/api-contracts";

/** Storybook-only client. Production code keeps `organizations-browser-client.ts`. */
export class OrganizationsClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: RequestId;
  readonly retryAfterSeconds?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: RequestId;
    retryAfterSeconds?: number;
  }) {
    super(input.message);
    this.name = "OrganizationsClientError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

export type OrganizationsInvitationStoryState =
  | "success"
  | "pending"
  | "expired"
  | "notFound"
  | "rateLimited"
  | "error";

export type OrganizationsStoryState = {
  readonly acceptInvitation: OrganizationsInvitationStoryState;
};

const hang = <T>(): Promise<T> => new Promise(() => undefined);

const ACCEPTED_INVITATION: AcceptCompetitionInvitationResponse = {
  organizationId: "org-story",
  organizationName: "Liga Story",
  role: "member",
  competitionId: "competition-story",
  competitionName: "Copa Story",
  destination: {
    kind: "competition",
    organizationId: "org-story",
    competitionId: "competition-story",
  },
};

let state: OrganizationsStoryState = { acceptInvitation: "success" };

export function configureOrganizationsStory(next: Partial<OrganizationsStoryState>): void {
  state = { acceptInvitation: "success", ...next };
}

function invitationError(
  code: string,
  status = 400,
  retryAfterSeconds?: number,
): OrganizationsClientError {
  return new OrganizationsClientError({
    status,
    code,
    message: code,
    requestId: "2170e2f6-a47e-4338-83c3-27c054630810",
    retryAfterSeconds,
  });
}

export const organizationsBrowserClient = {
  listMine(): Promise<ListMyMembershipsResponse> {
    return Promise.resolve({ memberships: [] });
  },

  resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
    return Promise.resolve({ destination: { kind: "onboarding" }, memberships: [] });
  },

  create(_input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    return Promise.resolve({
      organizationId: "org-story",
      name: "Liga Story",
      role: "organizer",
    });
  },

  acceptInvitation(_input: AcceptInvitationRequest): Promise<AcceptCompetitionInvitationResponse> {
    switch (state.acceptInvitation) {
      case "pending":
        return hang();
      case "expired":
        return Promise.reject(invitationError("organizations.invitation_expired"));
      case "notFound":
        return Promise.reject(invitationError("organizations.invitation_not_found"));
      case "rateLimited":
        return Promise.reject(invitationError("api.rate_limited", 429, 12));
      case "error":
        return Promise.reject(invitationError("organizations.client_error", 503));
      case "success":
        return Promise.resolve(ACCEPTED_INVITATION);
      default: {
        const _exhaustive: never = state.acceptInvitation;
        return _exhaustive;
      }
    }
  },

  createCompetitionInvitation(
    _organizationId: string,
    _competitionId: string,
    _input: CreateInvitationRequest,
  ): Promise<CreateInvitationResponse> {
    return Promise.resolve({
      invitationId: "invitation-story",
      competitionId: "competition-story",
      token: "story-token",
      expiresAt: "2026-09-15T00:00:00.000Z",
      redeemPolicy: "single",
      maxRedemptions: 1,
    });
  },
};

export function pathForPostAuthDestination(destination: PostAuthDestinationDto): string {
  switch (destination.kind) {
    case "onboarding":
      return "/onboarding";
    case "personal":
      return "/player";
    case "organization":
      return `/orgs/${destination.organizationId}`;
    case "organizationPicker":
      return "/orgs";
    default: {
      const _exhaustive: never = destination;
      return _exhaustive;
    }
  }
}
