"use client";

import type {
  CompleteInvitationOnboardingRequest,
  CompleteInvitationOnboardingResponse,
  CompleteOrganizationOnboardingRequest,
  CompleteOrganizationOnboardingResponse,
  CompletePlayerOnboardingRequest,
  ExternalClubDto,
  InspectCompetitionInvitationRequest,
  InspectCompetitionInvitationResponse,
  SearchClubsQueryInput,
} from "@futrob/api-contracts";
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
  completePlayer(input: CompletePlayerOnboardingRequest): Promise<void>;
  searchExternalClubs(input: SearchClubsQueryInput): Promise<readonly ExternalClubDto[]>;
}

export const browserOnboardingGateway: OnboardingGateway = {
  checkOrganizationName: (input) => identityBrowserClient.checkOrganizationName(input),
  saveProgress: (input) => identityBrowserClient.saveOnboardingProgress(input),
  createOrganization: (input) => identityBrowserClient.completeOrganizationOnboarding(input),
  acceptInvitation: (input) => identityBrowserClient.completeInvitationOnboarding(input),
  inspectCompetitionInvitation: (input) =>
    identityBrowserClient.inspectCompetitionInvitation(input),
  async completePlayer(input) {
    await identityBrowserClient.completePlayerOnboarding(input);
  },
  async searchExternalClubs(input) {
    const result = await gameDataBrowserClient.searchClubs(input);
    if (!result.isOk()) {
      throw result.error;
    }
    return result.value.clubs;
  },
};
