import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { PlayerCompetitionsPage } from "@/modules/teams/presentation/player-competitions-page.tsx";
import { identityBrowserClient } from "@/modules/identity/presentation/identity-browser-client.ts";

const styles = stylex.create({
  pending: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: "1.25rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
});

export const Route = createFileRoute("/_app/player_/competitions")({
  component: ProtectedPlayerCompetitions,
});

function ProtectedPlayerCompetitions() {
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
    <PlayerCompetitionsPage />
  ) : (
    <main {...applyStyles(styles.pending)}>Comprobando tu onboarding…</main>
  );
}
