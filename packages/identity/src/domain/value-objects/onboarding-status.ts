import type { ActorId } from "@futrob/shared-kernel";

export const CURRENT_ONBOARDING_VERSION = 1;

export type OnboardingPath = "player" | "organization" | "invitation";

export interface OnboardingStatus {
  readonly completed: boolean;
  readonly completedAt: Date | null;
  readonly version: number | null;
  readonly path: OnboardingPath | null;
}

export interface CompletedOnboarding {
  readonly actorId: ActorId;
  readonly completedAt: Date;
  readonly version: number;
  readonly path: OnboardingPath;
}
