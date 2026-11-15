import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Caption,
  SectionTitle,
  Skeleton,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type { AccountSession, SessionDevice } from "@futrob/sdk";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { AccountAuth } from "./account-auth.ts";
import { useAccountSessionsQuery, useRevokeSessionMutation } from "./account-queries.ts";
import { styles } from "./account.styles.ts";

const sectionStyles = stylex.create({
  sessions: { display: "flex", flexDirection: "column", gap: "0.75rem", padding: 0, margin: 0 },
  session: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingBlock: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    listStyle: "none",
  },
  sessionText: { display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 0 },
  sessionName: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
});

export function deviceLabel(device: SessionDevice, t: Translator): string {
  if (device.kind === "app") return t("settings.deviceApp");
  if (device.client && device.os)
    return t("settings.deviceOn", { client: device.client, os: device.os });
  return device.client ?? device.os ?? t("settings.deviceUnknown");
}

export function SessionsSection({
  auth,
  active,
}: {
  readonly auth: AccountAuth;
  readonly active: boolean;
}) {
  const { t, locale } = useI18n();
  const sessions = useAccountSessionsQuery(auth, active);
  const revoke = useRevokeSessionMutation(auth);
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const others = sessions.data?.sessions.filter((session) => !session.current) ?? [];
  return (
    <section aria-labelledby="settings-sessions-title" {...applyStyles(styles.section)}>
      <SectionTitle id="settings-sessions-title">{t("settings.section.sessions")}</SectionTitle>
      <Caption>{t("settings.sessionsHint")}</Caption>
      {sessions.isPending ? (
        <div aria-busy="true" aria-label={t("settings.sessionsLoading")} role="status">
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      ) : sessions.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("settings.sessionsError")}</AlertDescription>
          <Button onClick={() => void sessions.refetch()} type="button" variant="outline">
            {t("account.retry")}
          </Button>
        </Alert>
      ) : (
        <>
          <ul {...applyStyles(sectionStyles.sessions)}>
            {sessions.data.sessions.map((session: AccountSession) => {
              const name = deviceLabel(session.device, t);
              return (
                <li key={session.id} {...applyStyles(sectionStyles.session)}>
                  <div {...applyStyles(sectionStyles.sessionText)}>
                    <span {...applyStyles(sectionStyles.sessionName)}>
                      <strong>{name}</strong>
                      {session.current ? (
                        <Badge variant="neutral">{t("settings.sessionCurrent")}</Badge>
                      ) : null}
                    </span>
                    <Caption>
                      {t("settings.sessionActivity", {
                        signedIn: format.format(session.signedInAt),
                        lastActive: format.format(session.lastActiveAt),
                      })}
                    </Caption>
                  </div>
                  {session.current ? null : (
                    <Button
                      aria-label={t("settings.sessionRevokeLabel", { device: name })}
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(session.token)}
                      type="button"
                      variant="outline"
                    >
                      {t("settings.sessionRevoke")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {others.length === 0 ? <Caption>{t("settings.sessionsOnlyThis")}</Caption> : null}
          {revoke.isError ? (
            <Alert role="alert" variant="destructive">
              <AlertDescription>{t("settings.sessionsRevokeError")}</AlertDescription>
            </Alert>
          ) : null}
          {others.length > 1 ? (
            <div {...applyStyles(styles.actions)}>
              <Button
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(null)}
                type="button"
                variant="outline"
              >
                {t("settings.sessionsRevokeOthers")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
