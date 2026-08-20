import type { OnboardingPathDto } from "@futrob/api-contracts";
import type { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { buildSupportFields } from "@/shared/presentation/support-fields.ts";

export interface OnboardingSupportError {
  readonly messageKey: ParameterlessMessageKey;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
}

export function finalizationError(
  path: OnboardingPathDto,
  error: IdentityOnboardingClientError | null,
): OnboardingSupportError {
  const supportFields = buildSupportFields({
    requestId: error?.requestId,
    retryAfterSeconds: error?.retryAfterSeconds,
  });

  const present = (messageKey: ParameterlessMessageKey): OnboardingSupportError => ({
    messageKey,
    ...supportFields,
  });

  if (error?.code === "api.rate_limited") {
    return present("errors.api.rate_limited");
  }

  if (error && path === "invitation") {
    switch (error.code) {
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
  if (error && path === "organization") {
    if (error.code === "organizations.name_conflict") {
      return present("errors.organizations.name_conflict");
    }
    if (error.code.startsWith("competitions.invalid_")) {
      return present("errors.onboarding.invalidCompetition");
    }
    if (error.code.startsWith("teams.invalid_")) {
      return present("errors.onboarding.invalidGameAccount");
    }
    return present(
      error.code === "organizations.invalid_name"
        ? "errors.organizations.invalid_name"
        : "errors.onboarding.createOrganization",
    );
  }
  if (error?.code.startsWith("teams.invalid_")) {
    return present("errors.onboarding.invalidGameAccount");
  }
  if (error && path === "player") {
    return present("errors.onboarding.completePlayer");
  }
  return present("errors.onboarding.finish");
}
