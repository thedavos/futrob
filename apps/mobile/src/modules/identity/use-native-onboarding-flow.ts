import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnboardingStepDto } from "@futrob/api-contracts";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { NativeOnboardingFlow } from "./onboarding-flow.ts";
import { clearPendingInvitation, peekPendingInvitation } from "./onboarding-draft.ts";
import { getSession } from "./session-store.ts";
import { useSessionGateQuery } from "./use-session-gate-query.ts";
import type { GateResult } from "./session-gate.ts";

export type NativeOnboardingLoad =
  | { readonly kind: "ready"; readonly flow: NativeOnboardingFlow }
  | { readonly kind: "redirect"; readonly href: string; readonly flow: NativeOnboardingFlow };

export function useNativeOnboardingFlow(step: OnboardingStepDto) {
  const queryClient = useQueryClient();
  const gate = useSessionGateQuery();
  return useQuery({
    queryKey: mobileQueryKeys.onboardingFlow(step),
    enabled: gate.data?.kind === "onboarding",
    queryFn: async (): Promise<NativeOnboardingLoad> => {
      const result = queryClient.getQueryData<GateResult>(mobileQueryKeys.sessionGate());
      if (result?.kind !== "onboarding") throw new Error("not onboarding");
      const session = await getSession();
      if (!session) throw new Error("no session");
      const next = await NativeOnboardingFlow.load(
        session.user.id,
        result.status,
        getFutrobClient(),
      );
      const pending = await peekPendingInvitation();
      if (pending) {
        await next.update({ path: "invitation", invitationToken: pending });
        await next.goTo("invitation");
        await clearPendingInvitation();
        return { kind: "redirect", href: "/(onboarding)/invitation", flow: next };
      }
      if (step === "review" && next.draft.path === "invitation") {
        await next.reinspectRestoredInvitation();
      }
      return { kind: "ready", flow: next };
    },
  });
}
