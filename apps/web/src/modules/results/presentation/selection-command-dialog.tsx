"use client";

import { useId, useRef, useState, type Dispatch, type FormEvent } from "react";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionProposalDto,
} from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Text,
  Textarea,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { EncounterPreview } from "./encounter-preview.ts";
import { SeriesPreviewPanel } from "./encounter-slots.tsx";
import {
  needsReason,
  needsSlots,
  REASON_MAX_LENGTH,
  type DraftEvent,
  type IntentCheck,
  type SelectionDraft,
  type TeamCommand,
} from "./selection-draft.ts";
import { ProposalSlots, SlotLines } from "./selection-record.tsx";
import { styles } from "./selection.styles.ts";

type Missing = Extract<IntentCheck, { ok: false }>["missing"];

export type SelectionCommandDialogProps = {
  readonly command: TeamCommand;
  /** Whether the state just read still allows the command. */
  readonly available: boolean;
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<DraftEvent>;
  readonly draft: SelectionDraft;
  readonly encounter: EncounterViewDto;
  readonly finalFocus: () => HTMLElement | null;
  /** Starts the command; returns the first missing input instead when it cannot. */
  readonly onSubmit: () => Missing | null;
  readonly preview: EncounterPreview;
  readonly readVersion: number;
  readonly t: Translator;
  readonly target: OfficialSelectionProposalDto | null;
};

export function SelectionCommandDialog(props: SelectionCommandDialogProps) {
  const { command, dispatch, draft, finalFocus, t } = props;
  return (
    <Dialog
      open={draft.open === command}
      onOpenChange={(open) => dispatch(open ? { type: "open", command } : { type: "close" })}
    >
      <DialogContent finalFocus={finalFocus} {...applyStyles(styles.dialog)}>
        <DialogHeader>
          <DialogTitle>{t(`encounter.selection.command.${command}.title`)}</DialogTitle>
          <DialogDescription>
            {t(`encounter.selection.command.${command}.description`)}
          </DialogDescription>
        </DialogHeader>
        <CommandForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function CommandForm({
  available,
  candidates,
  command,
  dispatch,
  draft,
  encounter,
  onSubmit,
  preview,
  readVersion,
  t,
  target,
}: SelectionCommandDialogProps) {
  const id = useId();
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const [missing, setMissing] = useState<Missing | null>(null);
  const { submission } = draft;
  const pending = submission.status === "pending";
  const unknown = submission.status === "unknown" && submission.attempt.intent.kind === command;
  const slotsIncomplete = preview.slots.some((slot) => slot.kind === "unassigned");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmit();
    setMissing(result);
    if (result === "reason") reasonInput.current?.focus();
  }

  return (
    <form aria-busy={pending} noValidate onSubmit={submit} {...applyStyles(styles.form)}>
      {target && command !== "propose" ? (
        <div aria-label={t("encounter.selection.dialog.target")} role="group">
          <Text look="label">{t("encounter.selection.dialog.target")}</Text>
          <ProposalSlots candidates={candidates} encounter={encounter} slots={target.slots} t={t} />
        </div>
      ) : null}
      {needsSlots(command) ? (
        <div aria-label={t("encounter.selection.dialog.slots")} role="group">
          <Text look="label">{t("encounter.selection.dialog.slots")}</Text>
          <SlotLines encounter={encounter} previews={preview.slots} sent={[]} t={t} />
          {slotsIncomplete ? (
            <Text role={missing === "slots" ? "alert" : undefined} className={styles.warning}>
              {t("encounter.selection.dialog.slotsIncomplete")}
            </Text>
          ) : null}
          <SeriesPreviewPanel series={preview.series} t={t} view={encounter} />
        </div>
      ) : null}
      {needsReason(command) ? (
        <Field disabled={pending} invalid={missing === "reason"}>
          <FieldLabel htmlFor={`${id}-reason`}>{t("encounter.selection.reason.label")}</FieldLabel>
          <Textarea
            ref={reasonInput}
            id={`${id}-reason`}
            required
            maxLength={REASON_MAX_LENGTH}
            value={draft.reasons[command]}
            onChange={(event) =>
              dispatch({ type: "edit_reason", command, text: event.target.value })
            }
            aria-describedby={`${id}-reason-help`}
            aria-invalid={missing === "reason"}
          />
          <FieldDescription id={`${id}-reason-help`}>
            {t("encounter.selection.reason.help")}
          </FieldDescription>
          {missing === "reason" ? (
            <FieldError match>{t("encounter.selection.reason.required")}</FieldError>
          ) : null}
        </Field>
      ) : null}
      <SubmissionNotice
        available={available}
        readVersion={readVersion}
        submission={submission}
        t={t}
        unknown={unknown}
      />
      <DialogFooter>
        <DialogClose disabled={pending} render={<Button variant="outline" />}>
          {t("encounter.selection.dialog.cancel")}
        </DialogClose>
        <Button type="submit" disabled={pending || !available}>
          {pending
            ? t("encounter.selection.dialog.submitting")
            : unknown
              ? t("encounter.selection.dialog.retry")
              : t(`encounter.selection.command.${command}.submit`)}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SubmissionNotice({
  available,
  readVersion,
  submission,
  t,
  unknown,
}: {
  readonly available: boolean;
  readonly readVersion: number;
  readonly submission: SelectionDraft["submission"];
  readonly t: Translator;
  readonly unknown: boolean;
}) {
  const lines: string[] = [];
  if (submission.status === "conflict") {
    lines.push(
      readVersion > submission.readVersion
        ? t("encounter.selection.conflict", { from: submission.readVersion, to: readVersion })
        : t("encounter.selection.conflictStale", { from: submission.readVersion }),
    );
  }
  if (!available) lines.push(t("encounter.selection.unavailable"));
  if (unknown) lines.push(t("encounter.selection.unknown"));
  if (submission.status === "invalid") lines.push(t.error(submission.code ?? "fallback"));
  if (lines.length === 0) return null;
  return (
    <Alert variant={submission.status === "conflict" || !available ? "warning" : "destructive"}>
      <AlertDescription role="alert">
        {lines.map((line) => (
          <Text as="p" key={line}>
            {line}
          </Text>
        ))}
      </AlertDescription>
    </Alert>
  );
}
