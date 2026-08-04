import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OnboardingStatusDto, SaveOnboardingProgressRequest } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { identityBrowserClient } from "./identity-browser-client.ts";

export type SaveOnboardingProgressFn = (
  input: SaveOnboardingProgressRequest,
) => Promise<OnboardingStatusDto>;

export function useOnboardingStatusQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.identity.onboardingStatus(),
    queryFn: () => identityBrowserClient.getOnboardingStatus(),
    enabled,
  });
}

export function useSaveOnboardingProgressMutation(
  saveFn: SaveOnboardingProgressFn = (input) => identityBrowserClient.saveOnboardingProgress(input),
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...queryKeys.identity.onboardingStatus(), "save"] as const,
    mutationFn: saveFn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.identity.onboardingStatus() });
      const previous = queryClient.getQueryData<OnboardingStatusDto>(
        queryKeys.identity.onboardingStatus(),
      );
      const optimistic: OnboardingStatusDto = {
        completed: previous?.completed ?? false,
        completedAt: previous?.completedAt ?? null,
        version: previous?.version ?? null,
        path: input.path,
        currentStep: input.currentStep,
      };
      queryClient.setQueryData(queryKeys.identity.onboardingStatus(), optimistic);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.identity.onboardingStatus(), context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.identity.onboardingStatus(), data);
    },
  });
}
