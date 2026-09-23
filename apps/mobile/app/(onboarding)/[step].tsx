import { useLocalSearchParams } from "expo-router";
import { onboardingStepSchema } from "@futrob/api-contracts";
import { OnboardingScreen } from "@/modules/identity/onboarding-screen";

export default function OnboardingStepRoute() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const parsed = onboardingStepSchema.safeParse(step);
  return (
    <OnboardingScreen step={parsed.success && parsed.data !== "game" ? parsed.data : "intention"} />
  );
}
