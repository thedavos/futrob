"use client";

import { useId, useState } from "react";
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
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Textarea,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { sanctionFailureText } from "./sanction-queries.ts";
import { styles } from "./sanctions.styles.ts";

/** Withdraws an active sanction. It stays listed, with who revoked it and why. */
export function RevokeSanctionDialog({
  description,
  onRevoke,
}: {
  /** Names what is being revoked, so the confirmation is unambiguous. */
  readonly description: string;
  readonly onRevoke: (reason: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        {t("sanctions.revoke.trigger")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <RevokeSanctionForm
          description={description}
          onClose={() => setOpen(false)}
          onRevoke={onRevoke}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RevokeSanctionForm({
  description,
  onClose,
  onRevoke,
}: {
  readonly description: string;
  readonly onClose: () => void;
  readonly onRevoke: (reason: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const id = useId();
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (pending) return;
    setFailure(null);
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setInvalid(true);
      return;
    }
    setPending(true);
    try {
      await onRevoke(trimmed);
      onClose();
    } catch (cause) {
      setFailure(sanctionFailureText(cause instanceof Error ? cause : null, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{t("sanctions.revoke.title")}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <div {...applyStyles(styles.dialogFields)}>
        {failure ? (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <Field disabled={pending} invalid={invalid}>
          <FieldLabel htmlFor={`${id}-reason`}>{t("sanctions.reason")}</FieldLabel>
          <Textarea
            aria-invalid={invalid}
            id={`${id}-reason`}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setInvalid(false);
            }}
            required
            rows={3}
            value={reason}
          />
          {invalid ? <FieldError match>{t("sanctions.reasonRequired")}</FieldError> : null}
        </Field>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} render={<Button variant="ghost" />}>
          {t("common.cancel")}
        </AlertDialogCancel>
        <Button disabled={pending} type="submit" variant="destructive">
          {t("sanctions.revoke.confirm")}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}
