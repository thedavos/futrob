import { TaggedError } from "@futrob/shared-kernel";

export class InvalidOnboardingProgress extends TaggedError("InvalidOnboardingProgress")<{
  code: "identity.invalid_onboarding_progress";
  message: string;
}> {}
