import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";
import { PlayerWorkspacePage } from "@/modules/teams/presentation/player-workspace-page.tsx";

export const Route = createFileRoute("/_app/player")({
  component: PlayerRoute,
});

function PlayerRoute() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void identityBrowserClient
      .getOnboardingStatus()
      .then((status) => {
        if (cancelled) {
          return;
        }
        if (!status.completed) {
          void navigate({ to: "/onboarding", replace: true });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!cancelled) {
          void navigate({ to: "/onboarding", replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!allowed) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-5 text-sm text-muted-foreground">
        Comprobando tu onboarding…
      </main>
    );
  }

  return <PlayerWorkspacePage />;
}
