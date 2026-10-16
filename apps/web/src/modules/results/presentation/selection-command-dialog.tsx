"use client";

import {
  useId,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
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
import { REASON_MAX_LENGTH, type Submission } from "./selection-draft.ts";
import {
  needsReason,
  needsSlots,
  type TeamCommand,
  type TeamDraft,
  type TeamDraftEvent,
  type TeamIntentCheck,
} from "./team-selection-draft.ts";
import { ProposalSlots, SlotLines } from "./selection-slots.tsx";
import { styles } from "./selection.styles.ts";

/**
 * Dialog frame every selection command shares: one form, the reconciliation notice and
 * a submit that stays disabled while an attempt is in flight. Escape and Cancel close
 * it unless a request is pending; focus then goes to `finalFocus`.
 */
export function CommandDialog({
  available,
  children,
  description,
  finalFocus,
  onClose,
  onSubmit,
  open,
  readVersion,
  submission,
  submitLabel,
  t,
  title,
  unknown,
}: {
  /** Whether the state just read still allows the command. */
  readonly available: boolean;
  readonly children: ReactNode;
  readonly description: string;
  readonly finalFocus: () => HTMLElement | null;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly open: boolean;
  readonly readVersion: number;
  readonly submission: Submission<unknown>;
  readonly submitLabel: string;
  readonly t: Translator;
  readonly title: string;
  /** The last attempt of this command has an unknown outcome; submitting replays it. */
  readonly unknown: boolean;
}) {
  const pending = submission.status === "pending";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent finalFocus={finalFocus} {...applyStyles(styles.dialog)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form aria-busy={pending} noValidate onSubmit={submit} {...applyStyles(styles.form)}>
          {children}
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
                  : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReasonField({
  disabled,
  help,
  inputRef,
  invalid,
  onChange,
  t,
  value,
}: {
  readonly disabled: boolean;
  readonly help: string;
  readonly inputRef: RefObject<HTMLTextAreaElement | null>;
  readonly invalid: boolean;
  readonly onChange: (text: string) => void;
  readonly t: Translator;
  readonly value: string;
}) {
  const id = useId();
  return (
    <Field disabled={disabled} invalid={invalid}>
      <FieldLabel htmlFor={`${id}-reason`}>{t("encounter.selection.reason.label")}</FieldLabel>
      <Textarea
        ref={inputRef}
        id={`${id}-reason`}
        required
        maxLength={REASON_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-reason-help`}
        aria-invalid={invalid}
      />
      <FieldDescription id={`${id}-reason-help`}>{help}</FieldDescription>
      {invalid ? <FieldError match>{t("encounter.selection.reason.required")}</FieldError> : null}
    </Field>
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
  readonly submission: Submission<unknown>;
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

type Missing = Extract<TeamIntentCheck, { ok: false }>["missing"];

export type SelectionCommandDialogProps = {
  readonly command: TeamCommand;
  /** Whether the state just read still allows the command. */
  readonly available: boolean;
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<TeamDraftEvent>;
  readonly draft: TeamDraft;
  readonly encounter: EncounterViewDto;
  readonly finalFocus: () => HTMLElement | null;
  /** Starts the command; returns the first missing input instead when it cannot. */
  readonly onSubmit: () => Missing | null;
  readonly preview: EncounterPreview;
  readonly readVersion: number;
  readonly t: Translator;
  readonly target: OfficialSelectionProposalDto | null;
};

/** A Team command: the proposal it answers, the slots it sends and its reason. */
export function SelectionCommandDialog({
  available,
  candidates,
  command,
  dispatch,
  draft,
  encounter,
  finalFocus,
  onSubmit,
  preview,
  readVersion,
  t,
  target,
}: SelectionCommandDialogProps) {
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const [missing, setMissing] = useState<Missing | null>(null);
  const { submission } = draft;
  const pending = submission.status === "pending";
  const slotsIncomplete = preview.slots.some((slot) => slot.kind === "unassigned");

  return (
    <CommandDialog
      available={available}
      description={t(`encounter.selection.command.${command}.description`)}
      finalFocus={finalFocus}
      onClose={() => {
        setMissing(null);
        dispatch({ type: "close" });
      }}
      onSubmit={() => {
        const result = onSubmit();
        setMissing(result);
        if (result === "reason") reasonInput.current?.focus();
      }}
      open={draft.open === command}
      readVersion={readVersion}
      submission={submission}
      submitLabel={t(`encounter.selection.command.${command}.submit`)}
      t={t}
      title={t(`encounter.selection.command.${command}.title`)}
      unknown={submission.status === "unknown" && submission.attempt.intent.kind === command}
    >
      {target && command !== "propose" ? (
        <div aria-label={t("encounter.selection.dialog.target")} role="group">
          <Text look="label">{t("encounter.selection.dialog.target")}</Text>
          <ProposalSlots candidates={candidates} encounter={encounter} slots={target.slots} t={t} />
        </div>
      ) : null}
      {needsSlots(command) ? (
        <div aria-label={t("encounter.selection.dialog.slots")} role="group">
          <Text look="label">{t("encounter.selection.dialog.slots")}</Text>
          <SlotLines encounter={encounter} previews={preview.slots} t={t} />
          {slotsIncomplete ? (
            <Text role={missing === "slots" ? "alert" : undefined} className={styles.warning}>
              {t("encounter.selection.dialog.slotsIncomplete")}
            </Text>
          ) : null}
          <SeriesPreviewPanel series={preview.series} t={t} view={encounter} />
        </div>
      ) : null}
      {needsReason(command) ? (
        <ReasonField
          disabled={pending}
          help={t("encounter.selection.reason.help")}
          inputRef={reasonInput}
          invalid={missing === "reason"}
          onChange={(text) => dispatch({ type: "edit_reason", command, text })}
          t={t}
          value={draft.input.reasons[command]}
        />
      ) : null}
    </CommandDialog>
  );
}
