import { authClient } from "@/modules/identity/auth-client.ts";

type AuthResult<T = unknown> = Promise<{
  readonly data?: T | null;
  readonly error: { readonly code?: string; readonly message?: string } | null;
}>;

/**
 * What the account dialog asks of Better Auth. Tests and stories pass fakes; the app uses
 * `authClient`, which reaches `apps/auth` through the web Worker's `/api/auth` proxy.
 */
export interface AccountAuth {
  readonly getSession: () => AuthResult<{
    readonly session: { readonly id: string };
    readonly user: { readonly email: string };
  }>;
  readonly listSessions: () => AuthResult<unknown>;
  readonly revokeSession: (input: { token: string }) => AuthResult;
  readonly revokeOtherSessions: () => AuthResult;
  readonly changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: true;
  }) => AuthResult;
  readonly changeEmail: (input: { newEmail: string; callbackURL: string }) => AuthResult;
  readonly signOut: () => Promise<void>;
}

export const defaultAccountAuth: AccountAuth = {
  getSession: () => authClient.getSession(),
  listSessions: () => authClient.listSessions(),
  revokeSession: (input) => authClient.revokeSession(input),
  revokeOtherSessions: () => authClient.revokeOtherSessions(),
  changePassword: (input) => authClient.changePassword(input),
  changeEmail: (input) => authClient.changeEmail(input),
  signOut: async () => {
    await authClient.signOut();
  },
};
