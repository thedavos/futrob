import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountDeletionStatusDto } from "@futrob/api-contracts";
import { authSessionListSchema, toAccountSessions, type AccountSession } from "@futrob/sdk";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { AccountAuth } from "./account-auth.ts";

export interface AccountSessionsView {
  readonly sessions: readonly AccountSession[];
  readonly email: string | null;
}

/** Sessions on every device, this one first. Fails when Better Auth answers an error. */
export function useAccountSessionsQuery(auth: AccountAuth, enabled = true) {
  return useQuery({
    queryKey: queryKeys.identity.sessions(),
    enabled,
    queryFn: async (): Promise<AccountSessionsView> => {
      const [listed, current] = await Promise.all([auth.listSessions(), auth.getSession()]);
      if (listed.error) throw new Error(listed.error.code ?? "auth.list_sessions_failed");
      const sessions = authSessionListSchema.parse(listed.data ?? []);
      return {
        sessions: toAccountSessions(sessions, current.data?.session.id ?? null),
        email: current.data?.user.email ?? null,
      };
    },
  });
}

/** Revokes one session (by token) or, without a token, every session but this one. */
export function useRevokeSessionMutation(auth: AccountAuth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string | null) => {
      const result = token ? await auth.revokeSession({ token }) : await auth.revokeOtherSessions();
      if (result.error) throw new Error(result.error.code ?? "auth.revoke_session_failed");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.sessions() }),
  });
}

export function useAccountDeletionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.identity.accountDeletion(),
    queryFn: () => identityBrowserClient.getAccountDeletion(),
    enabled,
  });
}

export function useRequestAccountDeletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => identityBrowserClient.requestAccountDeletion({ password }),
    onSuccess: (status) => {
      queryClient.setQueryData(queryKeys.identity.accountDeletion(), status);
    },
    // A 409 means new blockers: reload them so the section lists what to resolve.
    onError: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.identity.accountDeletion() }),
  });
}

export function useCancelAccountDeletionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => identityBrowserClient.cancelAccountDeletion(),
    onSuccess: (status: AccountDeletionStatusDto) => {
      queryClient.setQueryData(queryKeys.identity.accountDeletion(), status);
    },
  });
}
