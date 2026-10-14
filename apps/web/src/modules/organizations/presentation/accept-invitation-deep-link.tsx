"use client";

import { useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  Logo,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { Navigate } from "@tanstack/react-router";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useAcceptInvitationQuery } from "@/modules/organizations/presentation/organization-queries.ts";
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
  errorStack: {
    display: "grid",
    gap: "1rem",
  },
});

const logo = applyStyles(styles.logo);

export function AcceptInvitationDeepLink({ plainToken }: Readonly<{ plainToken: string }>) {
  const acceptInvitation = useAcceptInvitationQuery(plainToken);
  const retry = useRetryAfterCountdown();
  const startedForError = useRef(0);
  const clientError =
    acceptInvitation.error instanceof OrganizationsClientError ? acceptInvitation.error : null;
  if (
    acceptInvitation.isError &&
    clientError?.retryAfterSeconds &&
    acceptInvitation.errorUpdatedAt !== startedForError.current
  ) {
    startedForError.current = acceptInvitation.errorUpdatedAt;
    retry.start(clientError.retryAfterSeconds);
  }
  const error: SupportError | null = acceptInvitation.isError
    ? {
        message: clientError?.retryAfterSeconds
          ? "Alcanzaste el límite temporal de invitaciones."
          : invitationAcceptErrorMessage(clientError),
        requestId: clientError?.requestId,
        retryAfterSeconds: clientError?.retryAfterSeconds,
      }
    : null;

  if (acceptInvitation.data) {
    const accepted = acceptInvitation.data;
    if (accepted.destination.kind === "competition") {
      return (
        <Navigate
          params={{
            orgId: accepted.destination.organizationId,
            competitionId: accepted.destination.competitionId,
          }}
          replace
          to="/orgs/$orgId/competitions/$competitionId"
        />
      );
    }
    return <Navigate params={{ orgId: accepted.organizationId }} replace to="/orgs/$orgId" />;
  }

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.brand)}>
        <Logo className={logo.className} style={logo.style} />
        <span {...applyStyles(styles.wordmark)}>Futrob</span>
      </header>
      <PageHeader>
        <PageHeaderTitle>Únete a una competición</PageHeaderTitle>
        <PageHeaderDescription>
          {error ? "No se pudo completar la invitación." : "Estamos validando tu invitación…"}
        </PageHeaderDescription>
      </PageHeader>
      {error ? (
        <div {...applyStyles(styles.errorStack)}>
          <SupportErrorAlert
            error={{ ...error, retryAfterSeconds: retry.remainingSeconds || undefined }}
          />
          <Button
            disabled={acceptInvitation.isFetching || retry.blocked}
            onClick={() => void acceptInvitation.refetch()}
            type="button"
          >
            {acceptInvitation.isFetching
              ? "Procesando…"
              : retry.blocked
                ? `Reintentar en ${retry.remainingSeconds} s`
                : "Reintentar invitación"}
          </Button>
        </div>
      ) : (
        <Caption>Un momento…</Caption>
      )}
    </main>
  );
}
