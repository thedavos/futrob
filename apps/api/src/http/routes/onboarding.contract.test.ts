import { completePlayerOnboardingResponseSchema } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import clubInfoFixture from "@/adapters/game-data/ea-clubs/fixtures/club-info.json";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import {
  buildApp,
  createFetch,
  onboardingCompetition,
  serviceHeaders,
} from "@/http/http-app.harness.ts";

const externalClub = {
  providerKey: "ea-clubs",
  externalClubId: "10754",
  platform: "common-gen5",
  gameEdition: "fc26",
} as const;

function completePlayer(app: ReturnType<typeof buildApp>, actor: string, body: object) {
  return app.request("/api/v1/identity/onboarding/player", {
    method: "POST",
    headers: serviceHeaders(actor),
    body: JSON.stringify(body),
  });
}

describe("onboarding HTTP contract", () => {
  it.each([
    {
      outcome: "associated",
      fetcher: createFetch(() => Response.json(clubInfoFixture)),
      body: { externalClub },
    },
    {
      outcome: "failed",
      fetcher: createFetch(() => new Response("rate limited", { status: 429 })),
      body: { externalClub },
    },
    {
      outcome: "skipped",
      fetcher: createFetch(() => Response.json([])),
      body: {},
    },
  ] as const)("documents a player completion whose club is $outcome", async (scenario) => {
    const app = buildApp(scenario.fetcher);

    const response = await completePlayer(app, `actor-contract-${scenario.outcome}`, scenario.body);

    expect(response.status).toBe(200);
    const body = completePlayerOnboardingResponseSchema.parse(await response.clone().json());
    expect(body.externalClubAssociation).toBe(scenario.outcome);
    await expectMatchesOpenApi(response, "post", "/identity/onboarding/player");
  });

  it("keeps failing when the provider rejects the club itself", async () => {
    const app = buildApp(createFetch(() => Response.json({})));

    const response = await completePlayer(app, "actor-contract-missing-club", {
      externalClub: { ...externalClub, externalClubId: "missing-club" },
    });

    expect(response.status).toBe(404);
    await expectMatchesOpenApi(response, "post", "/identity/onboarding/player");
  });

  it("refuses an organization whose first competition format is outside the Free plan", async () => {
    const app = buildApp(createFetch(() => Response.json([])));

    const response = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders("actor-contract-pro-format"),
      body: JSON.stringify({
        name: "Liga Grupos",
        competition: { ...onboardingCompetition, format: "groups-knockout" },
      }),
    });

    expect(response.status).toBe(402);
    expect(await response.clone().json()).toMatchObject({
      code: "competitions.format_not_in_plan",
    });
    await expectMatchesOpenApi(response, "post", "/identity/onboarding/organization");
  });
});
