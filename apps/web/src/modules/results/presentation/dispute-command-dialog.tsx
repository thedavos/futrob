"use client";

import { useId, useRef, useState, type Dispatch, type RefObject } from "react";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Checkbox,
  ChoiceGroup,
  ChoiceGroupItem,
  Text,
  typography,
} from "@futrob/ui";
import { WarningIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  acknowledgementRequired,
  approvableProposals,
  flagsFor,
  type OperatorCommand,
  type OperatorDraft,
  type OperatorDraftEvent,
  type OperatorIntentCheck,
} from "./dispute-review-draft.ts";
import { CommandDialog, ReasonField } from "./selection-command-dialog.tsx";
import { currentProposalOf } from "./selection-draft.ts";
import { proposalLabel, teamNameIn } from "./selection-record.tsx";
import { ProposalSlots, proposalSlotLines } from "./selection-slots.tsx";
import { styles } from "./selection.styles.ts";

type Missing = Extract<OperatorIntentCheck, { ok: false }>["missing"];

export type DisputeCommandDialogProps = {
  readonly command: OperatorCommand;
  /** Whether the state just read still allows the decision. */
  readonly available: boolean;
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<OperatorDraftEvent>;
  readonly draft: OperatorDraft;
  readonly encounter: EncounterViewDto;
  readonly finalFocus: () => HTMLElement | null;
  /** Starts the decision; returns the first missing input instead when it cannot. */
  readonly onSubmit: () => Missing | null;
  readonly readVersion: number;
  readonly t: Translator;
  readonly view: OfficialSelectionViewDto;
};

/**
 * One operator decision. Each dialog states exactly what it acts on: the dispute being
 * taken, the proposal being approved, or the proposals a return closes.
 */
export function DisputeCommandDialog(props: DisputeCommandDialogProps) {
  const { available, command, dispatch, draft, finalFocus, onSubmit, readVersion, t } = props;
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const acknowledgement = useRef<HTMLSpanElement>(null);
  const [missing, setMissing] = useState<Missing | null>(null);
  const { submission } = draft;

  return (
    <CommandDialog
      available={available}
      description={t(`encounter.review.command.${command}.description`)}
      finalFocus={finalFocus}
      onClose={() => {
        setMissing(null);
        dispatch({ type: "close" });
      }}
      onSubmit={() => {
        const result = onSubmit();
        setMissing(result);
        if (result === "reason") reasonInput.current?.focus();
        if (result === "proposal")
          choices.current?.querySelector<HTMLElement>("[role=radio]")?.focus();
        if (result === "acknowledgement") acknowledgement.current?.focus();
      }}
      open={draft.open === command}
      readVersion={readVersion}
      submission={submission}
      submitLabel={t(`encounter.review.command.${command}.submit`)}
      t={t}
      title={t(`encounter.review.command.${command}.title`)}
      unknown={submission.status === "unknown" && submission.attempt.intent.kind === command}
    >
      {command === "review_dispute" ? <DisputeSummary {...props} /> : null}
      {command === "approve_proposal" ? (
        <ApprovalChoice
          {...props}
          acknowledgementRef={acknowledgement}
          choicesRef={choices}
          missing={missing}
        />
      ) : null}
      {command === "return_to_selection" ? <ReturnSummary {...props} /> : null}
      <ReasonField
        disabled={submission.status === "pending"}
        help={t("encounter.review.reason.help")}
        inputRef={reasonInput}
        invalid={missing === "reason"}
        onChange={(text) => dispatch({ type: "edit_reason", command, text })}
        t={t}
        value={draft.input.reasons[command]}
      />
    </CommandDialog>
  );
}

function DisputeSummary({ candidates, encounter, t, view }: DisputeCommandDialogProps) {
  const dispute = view.activeDispute;
  const current = currentProposalOf(view);
  return (
    <div
      aria-label={t("encounter.review.dialog.dispute")}
      role="group"
      {...applyStyles(styles.summary)}
    >
      <Text look="label">{t("encounter.review.dialog.dispute")}</Text>
      {dispute ? (
        <>
          <Caption>
            {t("encounter.selection.dispute.openedBy", {
              team: teamNameIn(encounter, t)(dispute.openedByTeamId),
            })}
          </Caption>
          <Text className={styles.reason}>{dispute.openedReason}</Text>
        </>
      ) : null}
      {current ? (
        <>
          <Caption>{proposalLabel(current, t)}</Caption>
          <ProposalSlots
            candidates={candidates}
            encounter={encounter}
            slots={current.slots}
            t={t}
          />
        </>
      ) : null}
    </div>
  );
}

function ApprovalChoice({
  acknowledgementRef,
  candidates,
  choicesRef,
  dispatch,
  draft,
  encounter,
  missing,
  t,
  view,
}: DisputeCommandDialogProps & {
  readonly acknowledgementRef: RefObject<HTMLSpanElement | null>;
  readonly choicesRef: RefObject<HTMLDivElement | null>;
  readonly missing: Missing | null;
}) {
  const id = useId();
  const teamName = teamNameIn(encounter, t);
  const pending = draft.submission.status === "pending";
  const { input } = draft;
  const chosen = approvableProposals(view).find((proposal) => proposal.id === input.proposalId);
  const flags = flagsFor(view, input.proposalId);
  const required = acknowledgementRequired(view, input, draft.submission);
  return (
    <>
      <div ref={choicesRef} {...applyStyles(styles.summary)}>
        <Text look="label" id={`${id}-choose`}>
          {t("encounter.review.dialog.choose")}
        </Text>
        <ChoiceGroup<string | null>
          aria-labelledby={`${id}-choose`}
          aria-invalid={missing === "proposal"}
          aria-describedby={missing === "proposal" ? `${id}-choose-error` : undefined}
          disabled={pending}
          value={input.proposalId}
          onValueChange={(proposalId) => {
            if (proposalId) dispatch({ type: "choose_proposal", proposalId });
          }}
        >
          {approvableProposals(view).map((proposal) => {
            const label = `${proposalLabel(proposal, t)} · ${t("encounter.selection.proposal.by", {
              team: teamName(proposal.proposingTeamId),
            })}`;
            return (
              <ChoiceGroupItem
                aria-describedby={`${id}-${proposal.id}`}
                aria-label={label}
                className={styles.option}
                key={proposal.id}
                value={proposal.id}
              >
                <span {...applyStyles(styles.optionBody)}>
                  <span {...applyStyles(typography.label)}>{label}</span>
                  <span id={`${id}-${proposal.id}`} {...applyStyles(styles.optionBody)}>
                    {proposalSlotLines({
                      candidates,
                      encounter,
                      slots: proposal.slots,
                      t,
                    }).map((line) => (
                      <span key={line.slot} {...applyStyles(styles.slot)}>
                        <span>{line.summary}</span>
                        {line.match ? <Caption as="span">{line.match}</Caption> : null}
                      </span>
                    ))}
                  </span>
                </span>
              </ChoiceGroupItem>
            );
          })}
        </ChoiceGroup>
        {missing === "proposal" ? (
          <Text id={`${id}-choose-error`} role="alert" className={styles.danger}>
            {t("encounter.review.dialog.chooseRequired")}
          </Text>
        ) : null}
      </div>
      {chosen ? (
        <div
          aria-label={t("encounter.review.dialog.willApprove")}
          role="group"
          {...applyStyles(styles.summary)}
        >
          <Text look="label">{t("encounter.review.dialog.willApprove")}</Text>
          <Caption>{proposalLabel(chosen, t)}</Caption>
          <ProposalSlots candidates={candidates} encounter={encounter} slots={chosen.slots} t={t} />
        </div>
      ) : null}
      {flags.length > 0 ? (
        <div aria-label={t("encounter.review.dialog.flags")} role="group">
          <Text look="label">{t("encounter.review.dialog.flags")}</Text>
          <ul {...applyStyles(styles.slots)}>
            {flags.map((flag) => (
              <li key={`${flag.code}:${flag.providerMatchRef.externalId}`}>
                <Caption className={[styles.status, styles.warning]}>
                  <WarningIcon aria-hidden="true" />
                  {t(`encounter.selection.flags.${flag.code}`, {
                    match: flag.providerMatchRef.externalId,
                  })}
                </Caption>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {chosen && (required || input.acknowledged) ? (
        <div {...applyStyles(styles.summary)}>
          <div {...applyStyles(styles.check)}>
            <Checkbox
              aria-describedby={missing === "acknowledgement" ? `${id}-ack-error` : undefined}
              aria-invalid={missing === "acknowledgement"}
              checked={input.acknowledged}
              disabled={pending}
              id={`${id}-ack`}
              onCheckedChange={(acknowledged) => dispatch({ type: "acknowledge", acknowledged })}
              ref={acknowledgementRef}
            />
            <label htmlFor={`${id}-ack`} {...applyStyles(typography.label, styles.checkLabel)}>
              {t("encounter.review.dialog.acknowledge")}
            </label>
          </div>
          {missing === "acknowledgement" ? (
            <Text id={`${id}-ack-error`} role="alert" className={styles.danger}>
              {t("encounter.review.dialog.acknowledgeRequired")}
            </Text>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ReturnSummary({ candidates, encounter, t, view }: DisputeCommandDialogProps) {
  const closing = approvableProposals(view);
  return (
    <div
      aria-label={t("encounter.review.dialog.willClose")}
      role="group"
      {...applyStyles(styles.summary)}
    >
      <Text look="label">{t("encounter.review.dialog.willClose")}</Text>
      <Caption>{t("encounter.review.dialog.noResult")}</Caption>
      <ul {...applyStyles(styles.list)}>
        {closing.map((proposal) => (
          <li key={proposal.id} {...applyStyles(styles.summary)}>
            <Caption>{proposalLabel(proposal, t)}</Caption>
            <ProposalSlots
              candidates={candidates}
              encounter={encounter}
              slots={proposal.slots}
              t={t}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
