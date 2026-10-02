import type {
  AcceptCompetitionInvitationResponse,
  AcceptInvitationRequest,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ListMyMembershipsResponse,
  OrganizationNameAvailabilityRequest,
  OrganizationNameAvailabilityResponse,
  OrganizationProfileDto,
  OrganizationSlugAvailabilityRequest,
  OrganizationSlugAvailabilityResponse,
  PostAuthDestinationDto,
  RequestId,
  ResolvePostAuthDestinationResponse,
  SetOrganizationLogoRequest,
  UpdateOrganizationProfileRequest,
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

export type OrganizationsCreateStoryState =
  | "success"
  | "nameTaken"
  | "nameTakenOnCreate"
  | "checkFailed"
  | "pending"
  | "error";

export type OrganizationsSlugStoryState = "free" | "taken" | "invalid" | "failed";

export type OrganizationsProfileStoryState =
  | "success"
  | "slugConflict"
  | "pending"
  | "error"
  | "forbidden";

export type OrganizationsLogoStoryState = "success" | "uploadFailed" | "pending";

export const STORY_ORGANIZATION_PROFILE: OrganizationProfileDto = {
  organizationId: "org-story",
  name: "Liga Story",
  slug: "liga-story",
  timeZone: "America/Lima",
  logo: { kind: "monogram" },
};

export type OrganizationsStoryState = {
  readonly slugCheck: OrganizationsSlugStoryState;
  readonly profile: OrganizationProfileDto;
  readonly profileLoad: "success" | "pending" | "error";
  readonly profileSave: OrganizationsProfileStoryState;
  readonly logo: OrganizationsLogoStoryState;
  readonly acceptInvitation: OrganizationsInvitationStoryState;
  readonly createOrganization: OrganizationsCreateStoryState;
  readonly memberships: ListMyMembershipsResponse;
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

let state: OrganizationsStoryState = {
  slugCheck: "free",
  profile: STORY_ORGANIZATION_PROFILE,
  profileLoad: "success",
  profileSave: "success",
  logo: "success",
  acceptInvitation: "success",
  createOrganization: "success",
  memberships: { memberships: [] },
};

export function configureOrganizationsStory(next: Partial<OrganizationsStoryState>): void {
  state = {
    slugCheck: "free",
    profile: STORY_ORGANIZATION_PROFILE,
    profileLoad: "success",
    profileSave: "success",
    logo: "success",
    acceptInvitation: "success",
    createOrganization: "success",
    memberships: { memberships: [] },
    ...next,
  };
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
    return Promise.resolve(state.memberships);
  },

  resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
    return Promise.resolve({ destination: { kind: "onboarding" }, memberships: [] });
  },

  checkNameAvailability(
    _input: OrganizationNameAvailabilityRequest,
  ): Promise<OrganizationNameAvailabilityResponse> {
    switch (state.createOrganization) {
      case "nameTaken":
        return Promise.resolve({ available: false });
      case "checkFailed":
        return Promise.reject(invitationError("organizations.client_error", 503));
      case "success":
      case "nameTakenOnCreate":
      case "pending":
      case "error":
        return Promise.resolve({ available: true });
      default: {
        const _exhaustive: never = state.createOrganization;
        return _exhaustive;
      }
    }
  },

  create(input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    switch (state.createOrganization) {
      case "pending":
        return hang();
      case "nameTakenOnCreate":
        return Promise.reject(invitationError("organizations.name_conflict", 409));
      case "error":
        return Promise.reject(invitationError("organizations.client_error", 503));
      case "success":
      case "nameTaken":
      case "checkFailed":
        return Promise.resolve({
          organizationId: "org-story",
          name: input.name,
          slug: input.slug ?? "org-story",
          timeZone: input.timeZone,
          logo: { kind: "monogram" },
          role: "organizer",
        });
      default: {
        const _exhaustive: never = state.createOrganization;
        return _exhaustive;
      }
    }
  },

  checkSlugAvailability(
    input: OrganizationSlugAvailabilityRequest,
  ): Promise<OrganizationSlugAvailabilityResponse> {
    switch (state.slugCheck) {
      case "free":
        return Promise.resolve({ available: true });
      case "taken":
        // Only the plain slug is taken; the suggested `-2` variant is free.
        return Promise.resolve(
          input.slug.endsWith("-2")
            ? { available: true }
            : { available: false, reason: "taken", suggestion: `${input.slug}-2` },
        );
      case "invalid":
        return Promise.resolve({ available: false, reason: "invalid", suggestion: "liga-story" });
      case "failed":
        return Promise.reject(invitationError("organizations.client_error", 503));
      default: {
        const _exhaustive: never = state.slugCheck;
        return _exhaustive;
      }
    }
  },

  getProfile(_organizationId: string): Promise<OrganizationProfileDto> {
    switch (state.profileLoad) {
      case "pending":
        return hang();
      case "error":
        return Promise.reject(invitationError("organizations.client_error", 503));
      case "success":
        return Promise.resolve(state.profile);
      default: {
        const _exhaustive: never = state.profileLoad;
        return _exhaustive;
      }
    }
  },

  updateProfile(
    _organizationId: string,
    input: UpdateOrganizationProfileRequest,
  ): Promise<OrganizationProfileDto> {
    switch (state.profileSave) {
      case "pending":
        return hang();
      case "slugConflict":
        return Promise.reject(invitationError("organizations.slug_conflict", 409));
      case "forbidden":
        return Promise.reject(invitationError("organizations.forbidden", 403));
      case "error":
        return Promise.reject(invitationError("organizations.client_error", 503));
      case "success": {
        const current = state.profile;
        state = {
          ...state,
          profile: {
            ...current,
            name: input.name ?? current.name,
            slug: input.slug ?? current.slug,
            timeZone: input.timeZone ?? current.timeZone,
          },
        };
        return Promise.resolve(state.profile);
      }
      default: {
        const _exhaustive: never = state.profileSave;
        return _exhaustive;
      }
    }
  },

  setLogo(
    _organizationId: string,
    input: SetOrganizationLogoRequest,
  ): Promise<OrganizationProfileDto> {
    state = { ...state, profile: { ...state.profile, logo: input.logo } };
    return Promise.resolve(state.profile);
  },

  uploadLogo(
    organizationId: string,
    uploadKey: string,
    _file: File,
  ): Promise<{ readonly key: string }> {
    switch (state.logo) {
      case "pending":
        return hang();
      case "uploadFailed":
        return Promise.reject(invitationError("media.unsupported_type", 415));
      case "success":
        return Promise.resolve({ key: `organization-logos/${organizationId}/${uploadKey}.png` });
      default: {
        const _exhaustive: never = state.logo;
        return _exhaustive;
      }
    }
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
