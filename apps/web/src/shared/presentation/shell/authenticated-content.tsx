import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { OnboardingCompletedGate } from "@/modules/identity/presentation/onboarding-completed-gate.tsx";
import { AuthenticatedShell } from "./authenticated-shell.tsx";

const styles = stylex.create({
  bare: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
});

export function AuthenticatedContent({ children }: { readonly children: ReactNode }) {
  // The URL changes before destination loaders finish; the outlet still renders the
  // committed matches. Keep its frame until those matches commit together.
  const bare = useRouterState({
    select: (state) => state.matches.some((match) => isBareAuthenticatedRoute(match.pathname)),
  });
  return bare ? (
    <div {...applyStyles(styles.bare)}>{children}</div>
  ) : (
    <AuthenticatedShell>
      <OnboardingCompletedGate>{children}</OnboardingCompletedGate>
    </AuthenticatedShell>
  );
}

function isBareAuthenticatedRoute(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    /^\/invitations\/accept\/[^/]+/.test(pathname) ||
    /^\/roster-invitations\/accept\/[^/]+/.test(pathname)
  );
}
