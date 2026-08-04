import type { OnboardingDraft } from "./onboarding-flow.tsx";

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

export function isIanaTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("es", { timeZone: value.trim() }).format();
    return true;
  } catch {
    return false;
  }
}
