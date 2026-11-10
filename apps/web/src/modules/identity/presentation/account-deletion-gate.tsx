"use client";

import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { Alert, AlertDescription, applyStyles, Body, Button, Logo } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { accountDeletionGate } from "@futrob/sdk";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { announceIdentityChange } from "@/shared/presentation/query/identity-change.ts";
import { FailedScreen, PendingScreen } from "@/shared/presentation/status-screen.tsx";
import {
  useAccountDeletionQuery,
  useCancelAccountDeletionMutation,
} from "./account/account-queries.ts";

const styles = stylex.create({
  frame: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: "1.25rem",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  stack: {
    display: "flex",
    maxWidth: "28rem",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.25rem",
    textAlign: "center",
  },
  logo: { height: "2.5rem", width: "auto" },
  title: { margin: 0, fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.3 },
  copy: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  actions: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" },
});

/**
 * During the grace period a signed-in account sees only its deletion date and the way to
 * cancel (ADR-0028). Cancelling returns the app as it was.
 */
export function AccountDeletionGate({
  children,
  signOut = async () => {
    await authClient.signOut();
  },
}: {
  readonly children: ReactNode;
  readonly signOut?: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const status = useAccountDeletionQuery();
  const cancel = useCancelAccountDeletionMutation();

  if (status.isError) {
    return (
      <FailedScreen
        description={t("auth.session.checkFailedDescription")}
        onRetry={() => void status.refetch()}
        retryLabel={t("common.retry")}
        title={t("auth.session.checkFailed")}
      />
    );
  }
  if (status.isPending) return <PendingScreen message={t("auth.session.checking")} />;

  const gate = accountDeletionGate(status.data);
  if (gate.kind === "open") return children;

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(gate.scheduledFor);
  return (
    <main {...applyStyles(styles.frame)}>
      <div {...applyStyles(styles.stack)}>
        <Logo {...applyStyles(styles.logo)} />
        <div {...applyStyles(styles.copy)}>
          <h1 {...applyStyles(styles.title)}>{t("accountDeletion.title", { date })}</h1>
          <Body tone="muted">{t("accountDeletion.body")}</Body>
        </div>
        {cancel.isError ? (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{t("accountDeletion.cancelError")}</AlertDescription>
          </Alert>
        ) : null}
        <div {...applyStyles(styles.actions)}>
          <Button
            aria-busy={cancel.isPending}
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
            type="button"
          >
            {t(cancel.isPending ? "accountDeletion.cancelling" : "accountDeletion.cancel")}
          </Button>
          <Button
            disabled={cancel.isPending}
            onClick={() => {
              void signOut().then(() => announceIdentityChange(queryClient));
            }}
            type="button"
            variant="outline"
          >
            {t("accountDeletion.signOut")}
          </Button>
        </div>
      </div>
    </main>
  );
}
