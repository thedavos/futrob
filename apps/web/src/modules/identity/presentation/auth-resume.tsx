"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
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

  const value = useMemo<AuthResumeValue>(
    () => ({
      redirectTo,
      afterAuthenticated: (kind) =>
        navigateAfterAuth({
          kind,
          redirectTo,
          navigate,
          router,
        }),
    }),
    [navigate, redirectTo, router],
  );

  return <AuthResumeContext.Provider value={value}>{children}</AuthResumeContext.Provider>;
}

const storybookFallback: AuthResumeValue = {
  redirectTo: undefined,
  afterAuthenticated: async (kind) => {
    if (kind === "signup") {
      window.location.assign("/onboarding");
    }
  },
};

export function useAuthResume(): AuthResumeValue {
  return useContext(AuthResumeContext) ?? storybookFallback;
}
