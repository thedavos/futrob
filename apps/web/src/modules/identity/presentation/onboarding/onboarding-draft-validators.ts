import type { OnboardingDraft } from "./onboarding-flow.tsx";

export { isIanaTimeZone } from "@/modules/competitions/presentation/validate-competition-draft-input.ts";

export function validOrganizationName(value: string): boolean {
  const length = value.trim().length;
  return length > 0 && length <= 120;
}

export function validCompleteAccount(draft: OnboardingDraft): boolean {
  return Boolean(draft.gameAccountIdentifier.trim() && draft.platform && draft.gameEdition.trim());
}

export function validOptionalAccount(draft: OnboardingDraft): boolean {
  const empty = !draft.gameAccountIdentifier.trim() && !draft.platform && !draft.gameEdition.trim();
  return empty || validCompleteAccount(draft);
}

/** Maps onboarding display editions ("FC 26") to EA provider keys ("fc26"). */
export function providerGameEditionFromDraft(gameEdition: string, fallback = "fc26"): string {
  const normalized = gameEdition
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return normalized.length > 0 ? normalized : fallback;
}
