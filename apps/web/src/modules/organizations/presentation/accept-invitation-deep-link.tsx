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

export function AcceptInvitationDeepLink({
  error,
  onRetry,
  retrying = false,
}: Readonly<{
  error: SupportError | null;
  onRetry?: () => void;
  retrying?: boolean;
}>) {
  const retry = useRetryAfterCountdown();
  const startedForError = useRef<SupportError | null>(null);
  if (error?.retryAfterSeconds && error !== startedForError.current) {
    startedForError.current = error;
    retry.start(error.retryAfterSeconds);
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
          {onRetry ? (
            <Button disabled={retrying || retry.blocked} onClick={onRetry} type="button">
              {retrying
                ? "Procesando…"
                : retry.blocked
                  ? `Reintentar en ${retry.remainingSeconds} s`
                  : "Reintentar invitación"}
            </Button>
          ) : null}
        </div>
      ) : (
        <Caption>Un momento…</Caption>
      )}
    </main>
  );
}
