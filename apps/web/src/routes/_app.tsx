import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { authClient } from "@/modules/identity/auth-client.ts";
import { AuthenticatedShell } from "@/shared/presentation/shell/authenticated-shell.tsx";

const styles = stylex.create({
  pending: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
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
  const navigate = useNavigate();
  const location = useLocation();
  const session = authClient.useSession();
  const bare = isBareAuthenticatedRoute(location.pathname);

  useEffect(() => {
    if (!session.isPending && session.data?.user == null) {
      void navigate({
        to: "/login",
        search: { redirectTo: location.pathname },
        replace: true,
      });
    }
  }, [location.pathname, navigate, session.data?.user, session.isPending]);

  if (session.isPending || session.data?.user == null) {
    return <div {...applyStyles(styles.pending)}>Comprobando sesión…</div>;
  }

  if (bare) {
    return (
      <div {...applyStyles(styles.bare)}>
        <Outlet />
      </div>
    );
  }

  return (
    <AuthenticatedShell>
      <Outlet />
    </AuthenticatedShell>
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
