import { describe, expect, it } from "vite-plus/test";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { finalizationError } from "./onboarding-finalization-errors.ts";

describe("finalizationError", () => {
  it("maps typed and unknown errors without exposing transport messages", () => {
    expect(
      finalizationError(
        "invitation",
        new IdentityOnboardingClientError(404, "organizations.invitation_not_found"),
      ),
    ).toEqual({ messageKey: "errors.organizations.invitation_not_found" });
    expect(
      finalizationError(
        "player",
        new IdentityOnboardingClientError(502, "provider.secret_message"),
      ),
    ).toEqual({ messageKey: "errors.onboarding.completePlayer" });
  });

  it.each([
    "organizations.invitation_not_found",
    "organizations.invitation_expired",
    "organizations.invitation_revoked",
    "organizations.invitation_invalid",
  ] as const)("maps invitation finish code %s", (code) => {
    expect(finalizationError("invitation", new IdentityOnboardingClientError(400, code))).toEqual({
      messageKey: `errors.${code}`,
    });
  });

  it("maps organization name conflict and falls back for other org codes", () => {
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(409, "organizations.name_conflict"),
      ),
    ).toEqual({ messageKey: "errors.organizations.name_conflict" });
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(400, "organizations.invalid_name"),
      ),
    ).toEqual({ messageKey: "errors.organizations.invalid_name" });
    expect(
      finalizationError(
        "organization",
        new IdentityOnboardingClientError(500, "organizations.boom"),
      ),
    ).toEqual({ messageKey: "errors.onboarding.createOrganization" });
  });

  it("maps player finish failures and unknown errors", () => {
    expect(
      finalizationError("player", new IdentityOnboardingClientError(502, "teams.invalid_platform")),
    ).toEqual({
      messageKey: "errors.onboarding.invalidGameAccount",
    });
    expect(
      finalizationError(
        "player",
        new IdentityOnboardingClientError(500, "identity.onboarding_failed"),
      ),
    ).toEqual({ messageKey: "errors.onboarding.completePlayer" });
    expect(finalizationError("player", new Error("network"))).toEqual({
      messageKey: "errors.onboarding.finish",
    });
  });

  it("retains the request ID without exposing transport details", () => {
    const requestId = "2170e2f6-a47e-4338-83c3-27c054630800";

    expect(
      finalizationError(
        "player",
        new IdentityOnboardingClientError(502, "identity.onboarding_failed", requestId),
      ),
    ).toEqual({
      messageKey: "errors.onboarding.completePlayer",
      requestId,
    });
  });

  it("preserves retry metadata with safe copy for rate limiting", () => {
    const requestId = "2170e2f6-a47e-4338-83c3-27c054630800";

    expect(
      finalizationError(
        "invitation",
        new IdentityOnboardingClientError(429, "api.rate_limited", requestId, 45),
      ),
    ).toEqual({
      messageKey: "errors.api.rate_limited",
      requestId,
      retryAfterSeconds: 45,
    });
  });
});
