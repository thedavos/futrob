import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  applyStyles,
  Body,
  Button,
  Caption,
  Field,
  FieldLabel,
  Input,
  SectionTitle,
  Skeleton,
} from "@futrob/ui";
import type { AccountDeletionBlockerDto, AccountDeletionStatusDto } from "@futrob/api-contracts";
import {
  accountDeletionAvailability,
  PASSWORD_MAX_LENGTH,
  projectedAccountDeletionDate,
} from "@futrob/sdk";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { announceIdentityChange } from "@/shared/presentation/query/identity-change.ts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import type { AccountAuth } from "./account-auth.ts";
import { useAccountDeletionQuery, useRequestAccountDeletionMutation } from "./account-queries.ts";
import { styles } from "./account.styles.ts";

export function blockerCopy(blocker: AccountDeletionBlockerDto, t: Translator): string {
  return blocker.kind === "sole-organizer"
    ? t("settings.deleteBlockerOrganizer", { organization: blocker.organizationName })
    : t("settings.deleteBlockerCaptain", {
        team: blocker.teamName,
        competition: blocker.competitionName,
      });
}

/**
 * Explains what is deleted and kept, lists the responsibilities to hand over first and
 * schedules the deletion after the password is entered again. Scheduling signs out every
 * session, so the app returns to sign-in, where the grace screen offers to cancel.
 */
export function DeleteAccountSection({
  auth,
  active,
}: {
  readonly auth: AccountAuth;
  readonly active: boolean;
}) {
  const { t, locale } = useI18n();
  const status = useAccountDeletionQuery(active);
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  return (
    <section aria-labelledby="settings-delete-title" {...applyStyles(styles.section)}>
      <SectionTitle id="settings-delete-title">{t("settings.section.delete")}</SectionTitle>
      <Body>{t("settings.deleteIntro")}</Body>
      <div {...applyStyles(styles.section)}>
        <Body weight="semibold">{t("settings.deleteRemovedTitle")}</Body>
        <Caption>{t("settings.deleteRemoved")}</Caption>
        <Body weight="semibold">{t("settings.deleteKeptTitle")}</Body>
        <Caption>{t("settings.deleteKept")}</Caption>
      </div>
      {status.isPending ? (
        <div aria-busy="true" aria-label={t("settings.deleteLoading")} role="status">
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      ) : status.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("settings.deleteStatusError")}</AlertDescription>
          <Button onClick={() => void status.refetch()} type="button" variant="outline">
            {t("account.retry")}
          </Button>
        </Alert>
      ) : (
        <DeletionAvailability auth={auth} format={format} status={status.data} />
      )}
    </section>
  );
}

function DeletionAvailability({
  auth,
  format,
  status,
}: {
  readonly auth: AccountAuth;
  readonly format: Intl.DateTimeFormat;
  readonly status: AccountDeletionStatusDto;
}) {
  const { t } = useI18n();
  const availability = accountDeletionAvailability(status);
  if (availability.kind === "scheduled") {
    return (
      <p role="status">
        <Body>
          {t("settings.deleteScheduled", { date: format.format(availability.scheduledFor) })}
        </Body>
      </p>
    );
  }
  if (availability.kind === "blocked") {
    return (
      <Alert variant="warning">
        <AlertTitle>{t("settings.deleteBlockedTitle")}</AlertTitle>
        <AlertDescription>
          <ul>
            {availability.blockers.map((blocker) => (
              <li key={blocker.kind === "sole-organizer" ? blocker.organizationId : blocker.teamId}>
                {blockerCopy(blocker, t)}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }
  return <ConfirmDeletion auth={auth} format={format} />;
}

type DeleteFailure = "wrong-password" | "blocked" | "failed";

const DELETE_FAILURE_COPY = {
  "wrong-password": "settings.deleteWrongPassword",
  blocked: "settings.deleteBlocked",
  failed: "settings.deleteError",
} as const satisfies Record<DeleteFailure, string>;

function deleteFailure(error: Error): DeleteFailure {
  if (!(error instanceof IdentityOnboardingClientError)) return "failed";
  if (error.code === "identity.reauthentication_failed") return "wrong-password";
  if (error.code === "identity.account_deletion_blocked") return "blocked";
  return "failed";
}

function ConfirmDeletion({
  auth,
  format,
}: {
  readonly auth: AccountAuth;
  readonly format: Intl.DateTimeFormat;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const request = useRequestAccountDeletionMutation();
  const failure = request.isError ? deleteFailure(request.error) : null;
  // Shown before confirming; the API answers with the real date once it is scheduled.
  const projected = format.format(projectedAccountDeletionDate(new Date()));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) return;
    request.mutate(password, {
      onSuccess: async () => {
        // Every session, this one included, ended on the server; clear the local cookie too.
        await auth.signOut().catch(() => undefined);
        announceIdentityChange(queryClient);
      },
      onError: (error) => {
        if (deleteFailure(error) === "blocked") setOpen(false);
      },
    });
  }

  return (
    <>
      {failure === "blocked" ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t(DELETE_FAILURE_COPY.blocked)}</AlertDescription>
        </Alert>
      ) : null}
      <div {...applyStyles(styles.actions)}>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (request.isPending) return;
            setOpen(next);
            if (!next) {
              setPassword("");
              request.reset();
            }
          }}
        >
          <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
            {t("settings.deleteStart")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form noValidate onSubmit={submit} {...applyStyles(styles.section)}>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.deleteConfirmDescription", { date: projected })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Field invalid={failure === "wrong-password"}>
                <FieldLabel htmlFor="settings-delete-password">
                  {t("settings.deletePassword")}
                </FieldLabel>
                <Input
                  aria-describedby={failure ? "settings-delete-error" : undefined}
                  aria-invalid={failure === "wrong-password"}
                  autoComplete="current-password"
                  disabled={request.isPending}
                  id="settings-delete-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    request.reset();
                  }}
                  type="password"
                  value={password}
                />
              </Field>
              {failure && failure !== "blocked" ? (
                <Alert id="settings-delete-error" role="alert" variant="destructive">
                  <AlertDescription>{t(DELETE_FAILURE_COPY[failure])}</AlertDescription>
                </Alert>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={request.isPending}
                  render={<Button type="button" variant="ghost" />}
                >
                  {t("settings.deleteKeep")}
                </AlertDialogCancel>
                <Button
                  aria-busy={request.isPending}
                  disabled={request.isPending || !password}
                  type="submit"
                  variant="destructive"
                >
                  {t(request.isPending ? "settings.deleting" : "settings.deleteConfirm")}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
