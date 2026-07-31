import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const session = authClient.useSession();

  useEffect(() => {
    if (!session.isPending && session.data?.user == null) {
      void navigate({ to: "/login", replace: true });
    }
  }, [navigate, session.data?.user, session.isPending]);

  if (session.isPending || session.data?.user == null) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Comprobando sesión…
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Outlet />
    </div>
  );
}
