import type {
  CompleteOrganizationOnboardingResponse,
  OnboardingPathDto,
} from "@futrob/api-contracts";
import type { OnboardingGateway } from "./onboarding-flow-gateway.ts";
import {
  externalClubLocatorFromDraft,
  playerAccountFromDraft,
  type OnboardingDraft,
} from "./onboarding-draft.ts";

/** Where the actor lands once a path finishes; each is a typed app route. */
export type OnboardingFinishDestination =
  | {
      readonly to: "/orgs/$orgId";
      readonly params: { readonly orgId: string };
    }
  | {
      readonly to: "/orgs/$orgId/competitions/$competitionId";
      readonly params: { readonly orgId: string; readonly competitionId: string };
    }
  | {
      readonly to: "/player";
      readonly search: { readonly clubAssociation?: "failed" };
    };

export type OnboardingFinishResult =
  | {
      readonly path: "organization";
      readonly destination: Extract<OnboardingFinishDestination, { to: "/orgs/$orgId" }>;
      readonly created: CompleteOrganizationOnboardingResponse;
    }
  | {
      readonly path: "invitation" | "player";
      readonly destination: Exclude<OnboardingFinishDestination, { to: "/orgs/$orgId" }>;
    };

type FinishPath = (
  gateway: OnboardingGateway,
  draft: OnboardingDraft,
) => Promise<OnboardingFinishResult>;

/** One finishing request per path; the provider owns state, errors and navigation. */
export const finishOnboardingPath = {
  async organization(gateway, draft) {
    const created = await gateway.createOrganization({
      name: draft.organizationName.trim(),
      timeZone: draft.organizationTimeZone,
      gameAccount: playerAccountFromDraft(draft),
    });
    return {
      path: "organization",
      created,
      destination: {
        to: "/orgs/$orgId",
        params: { orgId: created.destination.organizationId },
      },
    };
  },
  async invitation(gateway, draft) {
    const accepted = await gateway.acceptInvitation({
      token: draft.invitationToken.trim(),
      gameAccount: playerAccountFromDraft(draft),
    });
    return {
      path: "invitation",
      destination: {
        to: "/orgs/$orgId/competitions/$competitionId",
        params: {
          orgId: accepted.destination.organizationId,
          competitionId: accepted.destination.competitionId,
        },
      },
    };
  },
  async player(gateway, draft) {
    const completed = await gateway.completePlayer({
      gameAccount: playerAccountFromDraft(draft),
      externalClub: externalClubLocatorFromDraft(draft),
    });
    return {
      path: "player",
      destination: {
        to: "/player",
        search: completed.externalClubAssociation === "failed" ? { clubAssociation: "failed" } : {},
      },
    };
  },
} satisfies Record<OnboardingPathDto, FinishPath>;
