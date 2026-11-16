"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Alert, AlertDescription, AlertTitle, applyStyles, Button } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon, EnvelopeSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

/** Where every account verification link lands (see apps/auth `EMAIL_VERIFICATION_CALLBACK`). */
export const EMAIL_VERIFICATION_PATH = "/verify-email";

const styles = stylex.create({
  stack: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  icon: { width: "1.25rem", height: "1.25rem" },
  noticeFrame: { paddingInline: "1.5rem", paddingTop: "1rem" },
  noticeBody: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "1rem",
    rowGap: "0.5rem",
  },
  link: {
    fontWeight: 500,
    color: colors.foreground,
    textUnderlineOffset: "4px",
    textDecorationLine: { default: "none", ":hover": "underline" },
  },
});

export type ResendState = "idle" | "sending" | "sent" | "rate-limited" | "failed";

/** Asks apps/auth for another link for the signed-in account. */
export function useResendVerification(
  email: string | undefined,
  refetchSession: () => Promise<void>,
) {
  const [state, setState] = useState<ResendState>("idle");
  async function resend() {
    if (email === undefined) return;
    setState("sending");
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: EMAIL_VERIFICATION_PATH,
      });
      if (result.error === null) {
        setState("sent");
      } else if (result.error.code === "EMAIL_ALREADY_VERIFIED") {
        // Verified in another tab: the fresh session hides the notice.
        await refetchSession();
        setState("idle");
      } else {
        setState(result.error.status === 429 ? "rate-limited" : "failed");
      }
    } catch {
      setState("failed");
    }
  }
  return { state, resend };
}

const RESEND_FEEDBACK = {
  sent: "emailVerification.resend.sent",
  "rate-limited": "emailVerification.resend.rateLimited",
  failed: "emailVerification.resend.failed",
} as const;

/**
 * Persistent notice in the signed-in shell while the account's email is not verified (AUTH-02).
 * It never blocks: onboarding and the product stay open.
 */
export function EmailVerificationNotice() {
  const { t } = useI18n();
  const session = authClient.useSession();
  const user = session.data?.user;
  const { state, resend } = useResendVerification(user?.email, async () => {
    await session.refetch();
  });
  if (user == null || user.emailVerified) return null;
  const feedback = state === "idle" || state === "sending" ? null : t(RESEND_FEEDBACK[state]);
  return (
    <div {...applyStyles(styles.noticeFrame)}>
      <Alert role="status" variant="warning">
        <EnvelopeSimpleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
        <AlertTitle>{t("emailVerification.notice.title")}</AlertTitle>
        <AlertDescription>
          <div {...applyStyles(styles.noticeBody)}>
            <span>{t("emailVerification.notice.body", { email: user.email })}</span>
            <Button
              aria-busy={state === "sending"}
              disabled={state === "sending"}
              onClick={() => void resend()}
              type="button"
              variant="outline"
            >
              {t(
                state === "sending"
                  ? "emailVerification.resend.sending"
                  : "emailVerification.resend.action",
              )}
            </Button>
            {feedback === null ? null : <span>{feedback}</span>}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function ContinueLink({ label }: { label: string }) {
  const link = applyStyles(styles.link);
  return (
    <Link className={link.className} style={link.style} to="/player">
      {label}
    </Link>
  );
}

/**
 * Landing page of a verification link. `error` is the code apps/auth adds for a used, expired
 * or invalid link; then the page offers another link while the account still needs one.
 */
export function VerifyEmailResult({ error }: Readonly<{ error: string | undefined }>) {
  const { t } = useI18n();
  const session = authClient.useSession();
  const user = session.data?.user;
  const { state, resend } = useResendVerification(user?.email, async () => {
    await session.refetch();
  });

  if (error === undefined) {
    return (
      <div {...applyStyles(styles.stack)}>
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
          <AlertTitle>{t("emailVerification.landing.verifiedTitle")}</AlertTitle>
          <AlertDescription>{t("emailVerification.landing.verifiedBody")}</AlertDescription>
        </Alert>
        <ContinueLink label={t("emailVerification.landing.continue")} />
      </div>
    );
  }

  if (session.isPending) {
    return <p role="status">{t("auth.session.checking")}</p>;
  }

  if (user?.emailVerified) {
    return (
      <div {...applyStyles(styles.stack)}>
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
          <AlertTitle>{t("emailVerification.landing.alreadyTitle")}</AlertTitle>
          <AlertDescription>{t("emailVerification.landing.alreadyBody")}</AlertDescription>
        </Alert>
        <ContinueLink label={t("emailVerification.landing.continue")} />
      </div>
    );
  }

  const link = applyStyles(styles.link);
  const feedback = state === "idle" || state === "sending" ? null : t(RESEND_FEEDBACK[state]);
  return (
    <div {...applyStyles(styles.stack)}>
      <Alert variant="destructive">
        <WarningCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
        <AlertTitle>{t("emailVerification.landing.deadTitle")}</AlertTitle>
        <AlertDescription>{t("emailVerification.landing.deadBody")}</AlertDescription>
      </Alert>
      {user == null ? (
        <Link
          className={link.className}
          search={{ redirectTo: "/player" }}
          style={link.style}
          to="/login"
        >
          {t("emailVerification.landing.signIn")}
        </Link>
      ) : (
        <>
          <Button
            aria-busy={state === "sending"}
            disabled={state === "sending" || state === "sent"}
            onClick={() => void resend()}
            type="button"
          >
            {t(
              state === "sending"
                ? "emailVerification.resend.sending"
                : "emailVerification.resend.action",
            )}
          </Button>
          {feedback === null ? null : <p role="status">{feedback}</p>}
        </>
      )}
    </div>
  );
}
