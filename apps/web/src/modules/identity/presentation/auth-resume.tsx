"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { authClient } from "@/modules/identity/auth-client.ts";
import { announceIdentityChange } from "@/shared/presentation/query/identity-change.ts";
import {
  navigateAfterAuth,
  type AfterAuthKind,
} from "@/modules/identity/presentation/navigate-after-auth.ts";

type AuthResumeValue = {
  readonly redirectTo: string | undefined;
  readonly afterAuthenticated: (kind: AfterAuthKind) => Promise<void>;
};

const AuthResumeContext = createContext<AuthResumeValue | null>(null);

type AuthResumeProviderProps = Readonly<{
  children: ReactNode;
  /** Already validated by `/_auth` `validateSearch`. */
  redirectTo: string | undefined;
}>;

/**
 * Post-auth resume for the auth tunnel. The `_auth` layout owns `redirectTo`
 * from route search; forms only call `afterAuthenticated`.
 */
export function AuthResumeProvider({ children, redirectTo }: AuthResumeProviderProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const value = useMemo<AuthResumeValue>(
    () => ({
      redirectTo,
      afterAuthenticated: async (kind) => {
        announceIdentityChange(queryClient);
        await refreshSessionStore();
        return navigateAfterAuth({
          kind,
          redirectTo,
          navigate,
          router,
        });
      },
    }),
    [navigate, queryClient, redirectTo, router],
  );

  return <AuthResumeContext.Provider value={value}>{children}</AuthResumeContext.Provider>;
}

type SessionStoreValue = { readonly refetch: () => Promise<void> };

/**
 * Reads the new session into the client store before entering the app. A public page that
 * read the session while signed out leaves that answer in the store, nothing refreshes it
 * while no component watches it, and the `/_app` gate would send the new user to log in.
 */
async function refreshSessionStore(): Promise<void> {
  const value: SessionStoreValue | undefined = authClient.$store.atoms.session?.get();
  await value?.refetch();
}

const storybookFallback: AuthResumeValue = {
  redirectTo: undefined,
  afterAuthenticated: async (kind) => {
    if (kind === "signup") {
      window.location.assign("/onboarding/intention");
    }
  },
};

export function useAuthResume(): AuthResumeValue {
  return useContext(AuthResumeContext) ?? storybookFallback;
}
