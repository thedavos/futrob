import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

describe("createFutrobClient identity", () => {
  const competition = {
    name: "Copa Inicial",
    gameEdition: "FC 26",
    platform: "playstation" as const,
    region: "south-america" as const,
    timeZone: "America/Lima",
    format: "league" as const,
  };
  const profile = { id: "profile-1", createdAt: "2026-07-31T12:00:00.000Z" };
  const competitionResponse = {
    competition: {
      id: "competition-1",
      organizationId: "org-1",
      ...competition,
      status: "draft",
      modality: "fc-clubs",
      createdAt: "2026-07-31T12:00:00.000Z",
      updatedAt: "2026-07-31T12:00:00.000Z",
    },
    rules: {
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: "2026-07-31T12:00:00.000Z",
    },
  };
  it("saves onboarding progress with PATCH and parses the resume point", async () => {
    let method: string | undefined;
    let body: unknown;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (_input, init) => {
        method = init?.method;
        if (typeof init?.body !== "string") {
          throw new TypeError("Expected a JSON request body");
        }
        body = JSON.parse(init.body);
        return Response.json({
          completed: false,
          completedAt: null,
          version: null,
          path: "player",
          currentStep: "game-account",
        });
      }) as typeof fetch,
    });

    const result = await client.identity.saveOnboardingProgress({
      path: "player",
      currentStep: "game-account",
    });

    expect(method).toBe("PATCH");
    expect(body).toEqual({ path: "player", currentStep: "game-account" });
    expect(result.currentStep).toBe("game-account");
  });

  it("completes each onboarding path through the identity onboarding resource", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
        requests.push({ url, body });
        if (url.endsWith("/organization")) {
          return Response.json({
            organizationId: "org-1",
            name: "Liga",
            role: "organizer",
            competition: competitionResponse,
            profile,
            gameAccount: null,
            destination: {
              kind: "competition-setup",
              organizationId: "org-1",
              competitionId: "competition-1",
            },
          });
        }
        if (url.endsWith("/invitation")) {
          return Response.json({
            organizationId: "org-2",
            organizationName: "Liga invitante",
            role: "member",
            competitionRole: "player",
            competitionId: "competition-2",
            competitionName: "Copa invitante",
            profile,
            gameAccount: null,
            destination: {
              kind: "competition",
              organizationId: "org-2",
              competitionId: "competition-2",
            },
          });
        }
        return Response.json({
          profile,
          gameAccount: null,
          externalClub: null,
          destination: "personal",
        });
      }) as typeof fetch,
    });

    await client.identity.completeOrganizationOnboarding({
      name: "Liga",
      competition,
      gameAccount: null,
    });
    await client.identity.completeInvitationOnboarding({
      token: "invite-token",
      gameAccount: null,
    });
    await client.identity.completePlayerOnboarding({ gameAccount: null });

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/identity/onboarding/organization",
        body: { name: "Liga", competition, gameAccount: null },
      },
      {
        url: "https://app.example.com/api/v1/identity/onboarding/invitation",
        body: { token: "invite-token", gameAccount: null },
      },
      {
        url: "https://app.example.com/api/v1/identity/onboarding/player",
        body: { gameAccount: null },
      },
    ]);
  });
});
