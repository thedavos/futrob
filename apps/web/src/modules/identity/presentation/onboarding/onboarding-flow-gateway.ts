"use client";

import type {
  CompleteInvitationOnboardingRequest,
  CompleteInvitationOnboardingResponse,
  CompleteOrganizationOnboardingRequest,
  CompleteOrganizationOnboardingResponse,
  CompletePlayerOnboardingRequest,
  CompletePlayerOnboardingResponse,
  ExternalClubDto,
  InspectCompetitionInvitationRequest,
  InspectCompetitionInvitationResponse,
  OrganizationPlan,
  SearchClubsQueryInput,
} from "@futrob/api-contracts";
import { billingBrowserClient } from "@/modules/billing/presentation/billing-browser-client.ts";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { gameDataBrowserClient } from "@/modules/game-data/presentation/game-data-browser-client.ts";

export interface OnboardingGateway {
  checkOrganizationName(input: { readonly name: string }): Promise<{ readonly available: boolean }>;
  saveProgress: typeof identityBrowserClient.saveOnboardingProgress;
  createOrganization(
    input: CompleteOrganizationOnboardingRequest,
  ): Promise<CompleteOrganizationOnboardingResponse>;
  acceptInvitation(
    input: CompleteInvitationOnboardingRequest,
  ): Promise<CompleteInvitationOnboardingResponse>;
  inspectCompetitionInvitation(
    input: InspectCompetitionInvitationRequest,
  ): Promise<InspectCompetitionInvitationResponse>;
  completePlayer(
    input: CompletePlayerOnboardingRequest,
  ): Promise<Pick<CompletePlayerOnboardingResponse, "externalClubAssociation">>;
  searchExternalClubs(input: SearchClubsQueryInput): Promise<readonly ExternalClubDto[]>;
  /** Public plan catalog; `null` when it cannot be read. */
  listPublicPlans(): Promise<readonly OrganizationPlan[] | null>;
}

export const browserOnboardingGateway: OnboardingGateway = {
  checkOrganizationName: (input) => identityBrowserClient.checkOrganizationName(input),
  saveProgress: (input) => identityBrowserClient.saveOnboardingProgress(input),
  createOrganization: (input) => identityBrowserClient.completeOrganizationOnboarding(input),
  acceptInvitation: (input) => identityBrowserClient.completeInvitationOnboarding(input),
  inspectCompetitionInvitation: (input) =>
    identityBrowserClient.inspectCompetitionInvitation(input),
  completePlayer: (input) => identityBrowserClient.completePlayerOnboarding(input),
  async searchExternalClubs(input) {
    const result = await gameDataBrowserClient.searchClubs(input);
    if (!result.isOk()) {
      throw result.error;
    }
    return result.value.clubs;
  },
  async listPublicPlans() {
    // An unreadable catalog gates nothing: the API still answers 402 for a Pro format.
    try {
      return (await billingBrowserClient.listPublicPlans()).plans;
    } catch {
      return null;
    }
  },
};
