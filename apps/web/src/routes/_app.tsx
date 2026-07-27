import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void authClient.getSession().then((session) => {
      if (cancelled) {
        return;
      }
      if (session.data?.user == null) {
        void navigate({ to: "/login" });
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
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
