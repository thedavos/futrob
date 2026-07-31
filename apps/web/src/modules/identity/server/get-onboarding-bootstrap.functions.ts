import { createServerFn } from "@tanstack/react-start";
import type { OnboardingStatusDto, PostAuthDestinationDto } from "@futrob/api-contracts";
import { withAuthenticatedProductApi } from "@/context/with-authenticated-product-api.server.ts";

export type OnboardingBootstrap =
  | {
      readonly status: OnboardingStatusDto;
      readonly destination: null;
    }
  | {
      readonly status: OnboardingStatusDto;
      readonly destination: PostAuthDestinationDto;
    };

export const getOnboardingBootstrap = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingBootstrap> =>
    withAuthenticatedProductApi(async ({ client }) => {
      const status = await client.identity.getOnboardingStatus();

      if (!status.completed) {
        return { status, destination: null };
      }

      const { destination } = await client.organizations.resolvePostAuthDestination();
      return { status, destination };
    }),
);
