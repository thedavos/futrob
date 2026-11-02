import type { OnboardingStatusDto, SaveOnboardingProgressRequest } from "@futrob/api-contracts";

/**
 * Records that a fresh actor opened onboarding, so the funnel (ADR-0026) counts actors who
 * leave on the first screen. The server ignores the write once the step is stored, and a
 * failed write never blocks onboarding.
 */
export async function recordOnboardingEntry(
  status: OnboardingStatusDto,
  save: (input: SaveOnboardingProgressRequest) => Promise<OnboardingStatusDto>,
): Promise<void> {
  if (status.completed || status.path !== null || status.currentStep !== "intention") return;
  await save({ path: null, currentStep: "intention" }).catch(() => undefined);
}
