import { TaggedError } from "@futrob/shared-kernel";
import type { OnboardingPath } from "../value-objects/onboarding-status.ts";

export class InvalidOnboardingProgress extends TaggedError("InvalidOnboardingProgress")<{
  code: "identity.invalid_onboarding_progress";
  message: string;
}> {}

export class OnboardingPathConflict extends TaggedError("OnboardingPathConflict")<{
  code: "identity.onboarding_path_conflict";
  message: string;
  completedPath: OnboardingPath;
  requestedPath: OnboardingPath;
}> {}
