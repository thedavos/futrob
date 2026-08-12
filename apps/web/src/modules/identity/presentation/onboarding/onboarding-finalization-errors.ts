import type { OnboardingPathDto } from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import { createTranslator, type Translator } from "@/shared/presentation/i18n/translate.ts";

export function finalizationError(
  path: OnboardingPathDto,
  caught: unknown,
  t: Translator = createTranslator("es"),
): SupportError {
  const requestId = caught instanceof IdentityOnboardingClientError ? caught.requestId : undefined;
  const retryAfterSeconds =
    caught instanceof IdentityOnboardingClientError ? caught.retryAfterSeconds : undefined;
  const present = (message: string): SupportError => ({
    message,
    ...(requestId ? { requestId } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });

  if (caught instanceof IdentityOnboardingClientError && caught.code === "api.rate_limited") {
    return present(t("errors.api.rate_limited"));
  }

  if (caught instanceof IdentityOnboardingClientError && path === "invitation") {
    switch (caught.code) {
      case "organizations.invitation_not_found":
        return present(t("errors.organizations.invitation_not_found"));
      case "organizations.invitation_expired":
        return present(t("errors.organizations.invitation_expired"));
      case "organizations.invitation_revoked":
        return present(t("errors.organizations.invitation_revoked"));
      case "organizations.invitation_invalid":
        return present(t("errors.organizations.invitation_invalid"));
    }
  }
  if (caught instanceof IdentityOnboardingClientError && path === "organization") {
    if (caught.code === "organizations.name_conflict") {
      return present(t("errors.organizations.name_conflict"));
    }
    if (caught.code.startsWith("competitions.invalid_")) {
      return present(t("errors.onboarding.invalidCompetition"));
    }
    if (caught.code.startsWith("teams.invalid_")) {
      return present(t("errors.onboarding.invalidGameAccount"));
    }
    return present(
      caught.code === "organizations.invalid_name"
        ? t("errors.organizations.invalid_name")
        : t("errors.onboarding.createOrganization"),
    );
  }
  if (caught instanceof IdentityOnboardingClientError && caught.code.startsWith("teams.invalid_")) {
    return present(t("errors.onboarding.invalidGameAccount"));
  }
  if (caught instanceof IdentityOnboardingClientError && path === "player") {
    return present(t("errors.onboarding.completePlayer"));
  }
  return present(t("errors.onboarding.finish"));
}
