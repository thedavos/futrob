import { createServerFn } from "@tanstack/react-start";
import {
  getClubResponseSchema,
  playerExternalClubSelectionInputSchema,
  type ExternalClubDto,
  type OnboardingStatusDto,
  type PostAuthDestinationDto,
} from "@futrob/api-contracts";
import { recordOnboardingEntry } from "./record-onboarding-entry.ts";
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
        await recordOnboardingEntry(status, (input) =>
          client.identity.saveOnboardingProgress(input),
        );
        return { status, destination: null };
      }

      const { destination } = await client.organizations.resolvePostAuthDestination();
      return { status, destination };
    }),
);

/** The club a landing link hands to onboarding, read for the signed-in actor. */
export const getOnboardingHandoffClub = createServerFn({ method: "GET" })
  .validator(playerExternalClubSelectionInputSchema)
  .handler(async ({ data }): Promise<ExternalClubDto> =>
    withAuthenticatedProductApi(async ({ client }) =>
      getClubResponseSchema.parse(
        await client.gameData.clubs.retrieve(data.externalClubId, {
          providerKey: data.providerKey,
          platform: data.platform,
          gameEdition: data.gameEdition,
        }),
      ),
    ),
  );
