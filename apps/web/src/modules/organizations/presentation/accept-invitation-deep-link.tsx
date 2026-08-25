"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, Logo, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useNavigate } from "@tanstack/react-router";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";

const styles = stylex.create({
  main: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "36rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2.5rem",
  },
  brand: {
    marginBottom: "2.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  logo: {
    height: 32,
    width: "auto",
  },
  wordmark: {
    fontWeight: 600,
    letterSpacing: "0.025em",
  },
  header: {
    marginBottom: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  subtitle: {
    color: colors.mutedForeground,
  },
  errorStack: {
    display: "grid",
    gap: "1rem",
  },
  waiting: {
    color: colors.mutedForeground,
  },
});

const logo = applyStyles(styles.logo);

export function AcceptInvitationDeepLink({ plainToken }: Readonly<{ plainToken: string }>) {
  const navigate = useNavigate();
  const acceptInvitation = useAcceptInvitationMutation();
  const [error, setError] = useState<SupportError | null>(null);
  const started = useRef(false);
  const retry = useRetryAfterCountdown();

  const acceptToken = useCallback(async () => {
    if (retry.blocked) return;
    setError(null);
    try {
      const accepted = await acceptInvitation.mutateAsync({ token: plainToken });
      if (accepted.destination.kind === "competition") {
        await navigate({
          to: "/orgs/$orgId/competitions/$competitionId",
          params: {
            orgId: accepted.destination.organizationId,
            competitionId: accepted.destination.competitionId,
          },
          replace: true,
        });
        return;
      }
      await navigate({
        to: "/orgs/$orgId",
        params: { orgId: accepted.organizationId },
        replace: true,
      });
    } catch (caught) {
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      retry.start(clientError?.retryAfterSeconds);
      setError({
        message: clientError?.retryAfterSeconds
          ? "Alcanzaste el límite temporal de invitaciones."
          : invitationAcceptErrorMessage(clientError),
        requestId: clientError?.requestId,
        retryAfterSeconds: clientError?.retryAfterSeconds,
      });
    }
  }, [acceptInvitation, navigate, plainToken, retry]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void acceptToken();
  }, [acceptToken]);

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.brand)}>
        <Logo className={logo.className} style={logo.style} />
        <span {...applyStyles(styles.wordmark)}>Futrob</span>
      </header>
      <div {...applyStyles(styles.header)}>
        <h1 {...applyStyles(typography.heading)}>Únete a una competición</h1>
        <p {...applyStyles(typography.subtitle, styles.subtitle)}>
          {error ? "No se pudo completar la invitación." : "Estamos validando tu invitación…"}
        </p>
      </div>
      {error ? (
        <div {...applyStyles(styles.errorStack)}>
          <SupportErrorAlert
            error={{ ...error, retryAfterSeconds: retry.remainingSeconds || undefined }}
          />
          <Button
            disabled={acceptInvitation.isPending || retry.blocked}
            onClick={() => void acceptToken()}
            type="button"
          >
            {acceptInvitation.isPending
              ? "Procesando…"
              : retry.blocked
                ? `Reintentar en ${retry.remainingSeconds} s`
                : "Reintentar invitación"}
          </Button>
        </div>
      ) : (
        <p {...applyStyles(typography.caption, styles.waiting)}>Un momento…</p>
      )}
    </main>
  );
}
