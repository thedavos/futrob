import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

describe("createFutrobClient identity", () => {
  it("requests, reads and cancels account deletion on one resource", async () => {
    const calls: Array<{ method: string | undefined; url: string; body: unknown }> = [];
    const scheduled = {
      deletion: {
        status: "scheduled",
        requestedAt: "2026-11-10T09:00:00.000Z",
        scheduledFor: "2026-12-10T09:00:00.000Z",
      },
      blockers: [],
    };
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        calls.push({ method: init?.method, url: requestUrl(input), body: parseMockJsonBody(init) });
        return Response.json(
          init?.method === "DELETE" ? { deletion: { status: "active" }, blockers: [] } : scheduled,
        );
      }),
    });

    await expect(client.identity.requestAccountDeletion({ password: "secret" })).resolves.toEqual(
      scheduled,
    );
    await expect(client.identity.getAccountDeletion()).resolves.toEqual(scheduled);
    await expect(client.identity.cancelAccountDeletion()).resolves.toEqual({
      deletion: { status: "active" },
      blockers: [],
    });
    expect(calls.map(({ method, url, body }) => [method, url, body])).toEqual([
      ["POST", "https://app.example.com/api/v1/identity/account/deletion", { password: "secret" }],
      ["GET", "https://app.example.com/api/v1/identity/account/deletion", null],
      ["DELETE", "https://app.example.com/api/v1/identity/account/deletion", null],
    ]);
  });

  const profile = { id: "profile-1", createdAt: "2026-07-31T12:00:00.000Z" };
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
            slug: "liga",
            timeZone: "America/Lima",
            logo: { kind: "monogram" },
            role: "organizer",
            profile,
            gameAccount: null,
            destination: {
              kind: "organization",
              organizationId: "org-1",
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
          externalClubAssociation: "skipped",
          destination: "personal",
        });
      }),
    });

    await client.identity.completeOrganizationOnboarding({
      name: "Liga",
      timeZone: "America/Lima",
      gameAccount: null,
    });
    await client.identity.completeInvitationOnboarding({
      token: "invite-token",
      gameAccount: null,
    });
    await expect(
      client.identity.completePlayerOnboarding({ gameAccount: null }),
    ).resolves.toMatchObject({ externalClubAssociation: "skipped" });

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/identity/onboarding/organization",
        body: { name: "Liga", timeZone: "America/Lima", gameAccount: null },
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
