import { Link } from "@tanstack/react-router";
import type { UnsubscribeEmailResponse } from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles, Button } from "@futrob/ui";
import * as stylex from "@stylexjs/stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ActivityClientError } from "./activity-browser-client.ts";
import { useUnsubscribeEmailMutation } from "./email-queries.ts";

const styles = stylex.create({
  stack: { display: "grid", gap: "1rem", justifyItems: "start" },
});

/**
 * Landing page of an email's unsubscribe link. It asks before saving: mail scanners open
 * links, and only a person should turn email off. Mail clients use the one-click header.
 */
export function EmailUnsubscribePage({
  token,
  unsubscribe,
}: {
  readonly token: string | null;
  readonly unsubscribe?: (token: string) => Promise<UnsubscribeEmailResponse>;
}) {
  const { t } = useI18n();
  const mutation = useUnsubscribeEmailMutation(unsubscribe);
  const invalid =
    token === null ||
    (mutation.error instanceof ActivityClientError &&
      (mutation.error.status === 404 || mutation.error.status === 400));
  const home = (
    <Button render={<Link to="/" />} variant="outline">
      {t("emailUnsubscribe.home")}
    </Button>
  );

  if (invalid) {
    return (
      <div {...applyStyles(styles.stack)}>
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("emailUnsubscribe.invalid")}</AlertDescription>
        </Alert>
        {home}
      </div>
    );
  }
  if (mutation.isSuccess) {
    return (
      <div {...applyStyles(styles.stack)}>
        <p role="status">{t("emailUnsubscribe.done")}</p>
        {home}
      </div>
    );
  }
  return (
    <div {...applyStyles(styles.stack)}>
      {mutation.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("emailUnsubscribe.error")}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        aria-busy={mutation.isPending}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(token)}
      >
        {t(mutation.isPending ? "emailUnsubscribe.confirming" : "emailUnsubscribe.confirm")}
      </Button>
    </div>
  );
}
