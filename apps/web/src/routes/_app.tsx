import { Navigate, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { authClient } from "@/modules/identity/auth-client.ts";
import { PrivateContentGate } from "@/modules/identity/presentation/private-content-gate.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { AuthenticatedShell } from "@/shared/presentation/shell/authenticated-shell.tsx";
import { PendingScreen } from "@/shared/presentation/status-screen.tsx";

const styles = stylex.create({
  bare: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
});

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();
  const { t } = useI18n();
  const session = authClient.useSession();
  const bare = isBareAuthenticatedRoute(location.pathname);

  if (session.isPending) {
    return <PendingScreen message={t("auth.session.checking")} />;
  }

  if (session.data?.user == null) {
    return <Navigate replace search={{ redirectTo: location.pathname }} to="/login" />;
  }

  return (
    <PrivateContentGate>
      {bare ? (
        <div {...applyStyles(styles.bare)}>
          <Outlet />
        </div>
      ) : (
        <AuthenticatedShell>
          <Outlet />
        </AuthenticatedShell>
      )}
    </PrivateContentGate>
  );
}

function isBareAuthenticatedRoute(pathname: string): boolean {
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return true;
  }
  // Deep-link accept flows redeem immediately; keep them outside the product shell.
  if (/^\/invitations\/accept\/[^/]+/.test(pathname)) {
    return true;
  }
  if (/^\/roster-invitations\/accept\/[^/]+/.test(pathname)) {
    return true;
  }
  return false;
}
