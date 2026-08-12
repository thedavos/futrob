import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { IdentityOnboardingClientError, identityBrowserClient } from "./identity-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("identityBrowserClient", () => {
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
});
