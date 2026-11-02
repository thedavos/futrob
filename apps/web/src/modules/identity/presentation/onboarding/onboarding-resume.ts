import {
  ONBOARDING_STEPS_BY_PATH,
  isOnboardingStepAllowed,
  type OnboardingPathDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import { competitionFromDraft, type OnboardingDraft } from "./onboarding-draft.ts";
import { validOptionalAccount, validOrganizationName } from "./onboarding-draft-validators.ts";

/** Whether the data a step collects is present in the draft, so the flow may move past it. */
const stepIsSatisfied = {
  intention: () => true,
  organization: (draft) => validOrganizationName(draft.organizationName),
  competition: (draft) => competitionFromDraft(draft) !== null,
  invitation: (draft) => draft.invitationPreview !== null,
  "game-account": validOptionalAccount,
  club: () => true,
  review: () => true,
} satisfies Record<OnboardingStepDto, (draft: OnboardingDraft) => boolean>;

/**
 * Where a returning actor continues: the step the server stored, or an earlier step of the
 * same path whose data the draft no longer has (another device, cleared storage, or the
 * invitation code, which is never stored).
 */
export function resumeOnboardingStep(
  path: OnboardingPathDto | null,
  storedStep: OnboardingStepDto | null,
  draft: OnboardingDraft,
): OnboardingStepDto {
  if (path === null || storedStep === null || !isOnboardingStepAllowed(path, storedStep)) {
    return "intention";
  }
  for (const step of ONBOARDING_STEPS_BY_PATH[path]) {
    if (step === storedStep || !stepIsSatisfied[step](draft)) return step;
  }
  return storedStep;
}
