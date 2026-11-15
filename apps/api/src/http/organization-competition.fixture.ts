import type { Hono } from "hono";
import { z } from "zod";
import {
  competitionDraftInputSchema,
  competitionDraftSchema,
  completeOrganizationOnboardingResponseSchema,
  playerGameAccountInputSchema,
} from "@futrob/api-contracts";
import { parseResponse } from "./parse-response.ts";

const inputSchema = z.object({
  name: z.string(),
  competition: competitionDraftInputSchema,
  gameAccount: playerGameAccountInputSchema.nullable().optional(),
});

/** Creates test resources through the same two HTTP operations an organizer uses. */
export async function createOrganizationCompetitionFixture(
  app: Hono,
  init: Omit<RequestInit, "body"> & { body: string },
) {
  const input = inputSchema.parse(JSON.parse(init.body));
  const organization = await parseResponse(
    completeOrganizationOnboardingResponseSchema,
    await app.request("/api/v1/identity/onboarding/organization", {
      ...init,
      body: JSON.stringify({
        name: input.name,
        timeZone: input.competition.timeZone,
        gameAccount: input.gameAccount,
      }),
    }),
  );
  const competition = await parseResponse(
    competitionDraftSchema,
    await app.request(`/api/v1/organizations/${organization.organizationId}/competitions`, {
      ...init,
      body: JSON.stringify(input.competition),
    }),
  );
  return { ...organization, competition };
}
