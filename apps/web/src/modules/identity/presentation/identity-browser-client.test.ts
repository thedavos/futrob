import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { IdentityOnboardingClientError, identityBrowserClient } from "./identity-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("identityBrowserClient", () => {
  it("requests a sanitized invitation preview", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        organizationId: "org-1",
        organizationName: "Liga",
        competitionId: "competition-1",
        competitionName: "Copa",
        competitionRole: "player",
        expiresAt: "2026-09-01T12:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await identityBrowserClient.inspectCompetitionInvitation({
      token: " private-token ",
    });

    expect(result.competitionName).toBe("Copa");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/identity/onboarding/invitation/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "private-token" }),
      }),
    );
  });

  it("preserves the request ID from an onboarding error", async () => {
    const requestId = "4d381f84-cd53-403c-b062-83b36fb4c422";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "organizations.name_conflict",
            messageKey: "errors.organizations.name_conflict",
            requestId,
          },
          { status: 409, headers: { "X-Request-ID": requestId } },
        ),
      ),
    );

    const caught = await identityBrowserClient
      .completeOrganizationOnboarding({
        name: "Liga repetida",
        competition: {
          name: "Copa",
          gameEdition: "FC 26",
          platform: "playstation",
          region: "south-america",
          timeZone: "America/Lima",
          format: "league",
        },
        gameAccount: null,
      })
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(IdentityOnboardingClientError);
    expect(caught).toMatchObject({
      code: "organizations.name_conflict",
      requestId,
      status: 409,
    });
  });

  it("propagates the retry delay from invitation onboarding", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "api.rate_limited",
            messageKey: "errors.api.rate_limited",
            retryAfterSeconds: 120,
          },
          { status: 429, headers: { "Retry-After": "120" } },
        ),
      ),
    );

    const caught = await identityBrowserClient
      .completeInvitationOnboarding({ token: "private-token", gameAccount: null })
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(IdentityOnboardingClientError);
    expect(caught).toMatchObject({
      code: "api.rate_limited",
      retryAfterSeconds: 120,
      status: 429,
    });
  });
});
