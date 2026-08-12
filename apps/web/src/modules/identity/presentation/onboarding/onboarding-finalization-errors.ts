import type { OnboardingPathDto } from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";

export interface OnboardingSupportError {
  readonly messageKey: ParameterlessMessageKey;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
}

export function finalizationError(
  path: OnboardingPathDto,
  caught: unknown,
): OnboardingSupportError {
  const requestId = caught instanceof IdentityOnboardingClientError ? caught.requestId : undefined;
  const retryAfterSeconds =
    caught instanceof IdentityOnboardingClientError ? caught.retryAfterSeconds : undefined;
  const present = (messageKey: ParameterlessMessageKey): OnboardingSupportError => ({
    messageKey,
    ...(requestId ? { requestId } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });

  if (caught instanceof IdentityOnboardingClientError && caught.code === "api.rate_limited") {
    return present("errors.api.rate_limited");
  }

  if (caught instanceof IdentityOnboardingClientError && path === "invitation") {
    switch (caught.code) {
      case "organizations.invitation_not_found":
        return present("errors.organizations.invitation_not_found");
      case "organizations.invitation_expired":
        return present("errors.organizations.invitation_expired");
      case "organizations.invitation_revoked":
        return present("errors.organizations.invitation_revoked");
      case "organizations.invitation_invalid":
        return present("errors.organizations.invitation_invalid");
      case "organizations.invitation_exhausted":
        return present("errors.organizations.invitation_exhausted");
    }
  }
  if (caught instanceof IdentityOnboardingClientError && path === "organization") {
    if (caught.code === "organizations.name_conflict") {
      return present("errors.organizations.name_conflict");
    }
    if (caught.code.startsWith("competitions.invalid_")) {
      return present("errors.onboarding.invalidCompetition");
    }
    if (caught.code.startsWith("teams.invalid_")) {
      return present("errors.onboarding.invalidGameAccount");
    }
    return present(
      caught.code === "organizations.invalid_name"
        ? "errors.organizations.invalid_name"
        : "errors.onboarding.createOrganization",
    );
  }
  if (caught instanceof IdentityOnboardingClientError && caught.code.startsWith("teams.invalid_")) {
    return present("errors.onboarding.invalidGameAccount");
  }
  if (caught instanceof IdentityOnboardingClientError && path === "player") {
    return present("errors.onboarding.completePlayer");
  }
  return present("errors.onboarding.finish");
}
