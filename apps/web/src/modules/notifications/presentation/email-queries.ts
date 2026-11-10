import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmailPreferencesDto, UnsubscribeEmailResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { emailBrowserClient } from "./email-browser-client.ts";

export function useEmailPreferencesQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.emailPreferences(),
    queryFn: () => emailBrowserClient.getPreferences(),
  });
}

export function useSaveEmailPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailPreferencesDto) => emailBrowserClient.savePreferences(input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.emailPreferences(), data);
    },
  });
}

export function useUnsubscribeEmailMutation(
  unsubscribe: (token: string) => Promise<UnsubscribeEmailResponse> = (token) =>
    emailBrowserClient.unsubscribe(token),
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => unsubscribe(token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.emailPreferences() }),
  });
}
