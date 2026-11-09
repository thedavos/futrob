import { describe, expect, it } from "vite-plus/test";
import {
  ONBOARDING_STEPS_BY_PATH as contractStepsByPath,
  onboardingStepSchema,
} from "@futrob/api-contracts";
import { ONBOARDING_STEPS, ONBOARDING_STEPS_BY_PATH as domainStepsByPath } from "@futrob/identity";

describe("onboarding step graph", () => {
  it("publishes the identity step graph unchanged to clients", () => {
    expect(contractStepsByPath).toEqual(domainStepsByPath);
    expect(onboardingStepSchema.options).toEqual([...ONBOARDING_STEPS]);
  });
});
