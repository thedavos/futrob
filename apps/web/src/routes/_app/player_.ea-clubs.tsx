import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerEaClubsPage } from "@/modules/teams/presentation/player-ea-clubs-page.tsx";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";

export const Route = createFileRoute("/_app/player_/ea-clubs")({
  component: ProtectedPlayerEaClubs,
});

function ProtectedPlayerEaClubs() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void identityBrowserClient
      .getOnboardingStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.completed) {
          void navigate({ to: "/onboarding", replace: true });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!cancelled) void navigate({ to: "/onboarding", replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return allowed ? (
    <PlayerEaClubsPage />
  ) : (
    <main className="flex min-h-svh items-center justify-center px-5 text-sm text-muted-foreground">
      Comprobando tu onboarding…
    </main>
  );
}
