import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

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
      fetchImpl: mockFetch(async (_input, init) => {
        method = init?.method;
        body = parseMockJsonBody(init);
        return Response.json({
          completed: false,
          completedAt: null,
          version: null,
          path: "player",
          currentStep: "game-account",
        });
      }),
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
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        const body = parseMockJsonBody(init);
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
          externalClubs: [],
          destination: "personal",
        });
      }),
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

  it("inspects a competition invitation through the preview endpoint", async () => {
    let request: { url: string; body: unknown } | undefined;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        request = {
          url: requestUrl(input),
          body: parseMockJsonBody(init),
        };
        return Response.json({
          organizationId: "org-1",
          organizationName: "Liga",
          competitionId: "competition-1",
          competitionName: "Copa",
          competitionRole: "player",
          expiresAt: "2026-09-01T12:00:00.000Z",
        });
      }),
    });

    const result = await client.identity.inspectCompetitionInvitation({ token: " private " });

    expect(request).toEqual({
      url: "https://app.example.com/api/v1/identity/onboarding/invitation/preview",
      body: { token: "private" },
    });
    expect(result.competitionName).toBe("Copa");
  });
});
