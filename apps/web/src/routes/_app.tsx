import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/modules/identity/auth-client.ts";
import { AuthenticatedShell } from "@/shared/presentation/shell/authenticated-shell.tsx";

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
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Comprobando sesión…
      </div>
    );
  }

  if (bare) {
    return (
      <div className="min-h-svh bg-background text-foreground">
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
