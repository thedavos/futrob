import {
  ONBOARDING_STEPS_BY_PATH,
  isOnboardingStepAllowed,
  type OnboardingPathDto,
  type OnboardingStatusDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import type { StoredOnboarding } from "./onboarding-draft-storage.ts";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";
import { validOptionalAccount, validOrganizationName } from "./onboarding-draft-validators.ts";

/** Whether the data a step collects is present in the draft, so the flow may move past it. */
const stepIsSatisfied = {
  intention: () => true,
  organization: (draft) => validOrganizationName(draft.organizationName),
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
  const steps =
    path === "organization" && (draft.organizationAccountStep || storedStep === "game-account")
      ? (["intention", "organization", "game-account", "review"] as const)
      : ONBOARDING_STEPS_BY_PATH[path];
  for (const step of steps) {
    if (step === storedStep || !stepIsSatisfied[step](draft)) return step;
  }
  return storedStep;
}

/**
 * Picks path, step and draft for a provider that is starting. Progress writes never block the
 * user, so the server can lag behind this browser (a null or earlier path after a failed
 * write); a local onboarding with a chosen path wins then. On the same path the further step
 * wins, so another device that got ahead is honored too.
 */
export function initialOnboardingState(
  status: Pick<OnboardingStatusDto, "path" | "currentStep">,
  stored: StoredOnboarding | null,
): StoredOnboarding {
  if (stored?.path == null) {
    const draft = createEmptyDraft();
    return {
      path: status.path,
      step: resumeOnboardingStep(status.path, status.currentStep, draft),
      draft,
    };
  }
  const { path, draft } = stored;
  const steps: readonly OnboardingStepDto[] = ONBOARDING_STEPS_BY_PATH[path];
  const serverStep = status.path === path ? status.currentStep : null;
  const further =
    serverStep !== null && steps.indexOf(serverStep) > steps.indexOf(stored.step)
      ? serverStep
      : stored.step;
  return { path, step: resumeOnboardingStep(path, further, draft), draft };
}
