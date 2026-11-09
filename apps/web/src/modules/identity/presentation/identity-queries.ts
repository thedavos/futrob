import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActorPreferencesDto,
  OnboardingStatusDto,
  SaveOnboardingProgressRequest,
  SidebarLayoutDto,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { identityBrowserClient } from "./identity-browser-client.ts";

export type SaveOnboardingProgressFn = (
  input: SaveOnboardingProgressRequest,
) => Promise<OnboardingStatusDto>;

/** Shown until the account's preference loads, and if it cannot be loaded. */
export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayoutDto = "navigation";

export function useActorPreferencesQuery() {
  return useQuery({
    queryKey: queryKeys.identity.preferences(),
    queryFn: () => identityBrowserClient.getActorPreferences(),
  });
}

export function useSaveActorPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ActorPreferencesDto) => identityBrowserClient.saveActorPreferences(input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.identity.preferences(), data);
    },
  });
}

export function useOnboardingStatusQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.identity.onboardingStatus(),
    queryFn: () => identityBrowserClient.getOnboardingStatus(),
    enabled,
  });
}

/** Puts the route-loaded status in the Query cache without a raw effect. */
export function useSeededOnboardingStatus(initialStatus: OnboardingStatusDto) {
  return useQuery({
    queryKey: queryKeys.identity.onboardingStatus(),
    queryFn: () => identityBrowserClient.getOnboardingStatus(),
    initialData: initialStatus,
    staleTime: Infinity,
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
