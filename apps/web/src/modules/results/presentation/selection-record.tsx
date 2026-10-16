import { useId, type ComponentProps } from "react";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionActionDto,
  OfficialSelectionProposalDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import { applyStyles, Badge, Caption, Heading, Text, type Icon } from "@futrob/ui";
import {
  ClockIcon,
  FileDashedIcon,
  ProhibitIcon,
  SealCheckIcon,
  ScalesIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  assignmentsOf,
  previewEncounter,
  type SlotPreview,
  type SlotSelection,
} from "./encounter-preview.ts";
import { currentProposalOf } from "./selection-draft.ts";
import { styles } from "./selection.styles.ts";

/*
 * Read-only record of an Encounter's official selection: status, proposals and audit
 * history exactly as served. Team and operator panels render it beside their own controls.
 */

type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"] | "none";

const STATUS = {
  none: { variant: "neutral", icon: FileDashedIcon },
  awaiting_provider_data: { variant: "neutral", icon: ClockIcon },
  candidates_available: { variant: "neutral", icon: ClockIcon },
  selection_in_progress: { variant: "neutral", icon: ClockIcon },
  awaiting_opponent_confirmation: { variant: "info", icon: ClockIcon },
  confirmed: { variant: "info", icon: ClockIcon },
  disputed: { variant: "warning", icon: WarningIcon },
  organizer_review: { variant: "warning", icon: ScalesIcon },
  approved: { variant: "approved", icon: SealCheckIcon },
  voided: { variant: "destructive", icon: ProhibitIcon },
} as const satisfies Record<
  SelectionStatus,
  { readonly variant: ComponentProps<typeof Badge>["variant"]; readonly icon: Icon }
>;

export type SelectionRecordProps = {
  readonly view: OfficialSelectionViewDto;
  readonly encounter: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  readonly t: Translator;
};

export function teamNameIn(encounter: EncounterViewDto, t: Translator) {
  return (teamId: string | null) =>
    teamId === encounter.home.teamId
      ? encounter.home.name
      : teamId === encounter.away.teamId
        ? encounter.away.name
        : t("encounter.selection.team.unknown");
}

export function SelectionStatusSummary({ view, encounter, format, t }: SelectionRecordProps) {
  const status: SelectionStatus = view.selection?.status ?? "none";
  const { variant, icon: StatusIcon } = STATUS[status];
  const current = currentProposalOf(view);
  const teamName = teamNameIn(encounter, t);
  return (
    <div {...applyStyles(styles.summary)}>
      <div {...applyStyles(styles.inline)}>
        <Badge variant={variant}>
          <StatusIcon aria-hidden="true" />
          {t(`encounter.selection.status.${status}`)}
        </Badge>
        {view.selection ? (
          <>
            <Caption as="span">
              {t("encounter.selection.version", { version: view.selection.version })}
            </Caption>
            <Caption as="span">
              {t("encounter.selection.round", { round: view.selection.round })}
            </Caption>
          </>
        ) : null}
      </div>
      {view.approvedResultId ? (
        <Text tone="default" weight="semibold" className={styles.status}>
          <SealCheckIcon aria-hidden="true" />
          {t("encounter.selection.approved")}
        </Text>
      ) : view.selection ? (
        <Caption>{t("encounter.selection.notOfficial")}</Caption>
      ) : null}
      {current && status === "awaiting_opponent_confirmation" ? (
        <Caption>
          {t("encounter.selection.deadline", {
            date: format.format(new Date(current.confirmationDeadline)),
          })}
        </Caption>
      ) : null}
      {view.activeDispute ? (
        <div aria-label={t("encounter.selection.dispute.title")} role="group">
          <Text look="label">
            {t("encounter.selection.dispute.title")} ·{" "}
            {t(`encounter.selection.dispute.status.${view.activeDispute.status}`)}
          </Text>
          <Caption>
            {t("encounter.selection.dispute.openedBy", {
              team: teamName(view.activeDispute.openedByTeamId),
            })}
          </Caption>
          <Text className={styles.reason}>{view.activeDispute.openedReason}</Text>
        </div>
      ) : null}
      {view.integrityFlags.length > 0 ? (
        <div aria-label={t("encounter.selection.flags.title")} role="group">
          <Text look="label">{t("encounter.selection.flags.title")}</Text>
          <ul {...applyStyles(styles.slots)}>
            {view.integrityFlags.map((flag) => (
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
    </div>
  );
}

const STANDING = {
  approved: { variant: "approved", label: "encounter.selection.proposal.approved" },
  current: { variant: "emphasis", label: "encounter.selection.proposal.current" },
  closed_round: { variant: "outline", label: "encounter.selection.proposal.closedRound" },
  superseded: { variant: "outline", label: "encounter.selection.proposal.superseded" },
} as const satisfies Record<
  string,
  {
    readonly variant: ComponentProps<typeof Badge>["variant"];
    readonly label: `encounter.selection.proposal.${string}`;
  }
>;

function standingOf(view: OfficialSelectionViewDto, proposal: OfficialSelectionProposalDto) {
  const selection = view.selection;
  if (proposal.id === selection?.currentProposalId) {
    return selection.status === "approved" ? STANDING.approved : STANDING.current;
  }
  return selection && proposal.round < selection.round
    ? STANDING.closed_round
    : STANDING.superseded;
}

export function proposalLabel(proposal: OfficialSelectionProposalDto, t: Translator) {
  return t("encounter.selection.proposal.label", {
    sequence: proposal.sequence,
    round: proposal.round,
  });
}

export function SelectionProposalList({
  candidates,
  encounter,
  format,
  t,
  view,
}: SelectionRecordProps & { readonly candidates: readonly EncounterCandidateDto[] }) {
  const id = useId();
  const teamName = teamNameIn(encounter, t);
  const proposals = [...view.proposals].sort(
    (a, b) => b.round - a.round || b.sequence - a.sequence,
  );
  return (
    <section aria-labelledby={`${id}-proposals`} {...applyStyles(styles.summary)}>
      <Heading as="h3" id={`${id}-proposals`}>
        {t("encounter.selection.proposals.title")}
      </Heading>
      <ol {...applyStyles(styles.list)}>
        {proposals.map((proposal) => {
          const label = proposalLabel(proposal, t);
          const standing = standingOf(view, proposal);
          return (
            <li aria-label={label} key={proposal.id} {...applyStyles(styles.item)}>
              <div {...applyStyles(styles.inline)}>
                <Text tone="default" weight="medium">
                  {label}
                </Text>
                <Badge variant={standing.variant}>{t(standing.label)}</Badge>
              </div>
              <Caption>
                {t("encounter.selection.proposal.by", { team: teamName(proposal.proposingTeamId) })}{" "}
                ·{" "}
                <time dateTime={proposal.createdAt}>
                  {format.format(new Date(proposal.createdAt))}
                </time>
              </Caption>
              <ProposalSlots
                candidates={candidates}
                encounter={encounter}
                slots={proposal.slots}
                t={t}
              />
              {proposal.reason ? <Text className={styles.reason}>{proposal.reason}</Text> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type ProposalSlotsProps = {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly encounter: EncounterViewDto;
  readonly slots: readonly SlotSelection[];
  readonly t: Translator;
};

/** Each slot resolved to its candidate's score; the provider reference when it is gone. */
export function proposalSlotTexts({ candidates, encounter, slots, t }: ProposalSlotsProps) {
  return previewEncounter(encounter, candidates, assignmentsOf(slots)).slots.map((preview) =>
    slotLine(preview, slots, encounter, t),
  );
}

export function ProposalSlots(props: ProposalSlotsProps) {
  return (
    <ul {...applyStyles(styles.slots)}>
      {proposalSlotTexts(props).map((line) => (
        <li key={line}>
          <Text tone="default">{line}</Text>
        </li>
      ))}
    </ul>
  );
}

/** One line per official slot; `sent` names references the candidate list no longer has. */
export function SlotLines({
  encounter,
  previews,
  sent,
  t,
}: {
  readonly encounter: EncounterViewDto;
  readonly previews: readonly SlotPreview[];
  readonly sent: readonly SlotSelection[];
  readonly t: Translator;
}) {
  return (
    <ul {...applyStyles(styles.slots)}>
      {previews.map((preview) => (
        <li key={preview.slot}>
          <Text tone="default">{slotLine(preview, sent, encounter, t)}</Text>
        </li>
      ))}
    </ul>
  );
}

function slotLine(
  preview: SlotPreview,
  slots: readonly SlotSelection[],
  encounter: EncounterViewDto,
  t: Translator,
): string {
  const slot = preview.slot;
  switch (preview.kind) {
    case "scored":
      return t("encounter.selection.slot.score", {
        slot,
        home: encounter.home.name,
        homeGoals: preview.score.home,
        awayGoals: preview.score.away,
        away: encounter.away.name,
      });
    case "unmatched":
      return t("encounter.selection.slot.unmatched", {
        slot,
        match: preview.candidate.reference.externalId,
      });
    case "unassigned": {
      const sent = slots.find((selection) => selection.officialSlot === slot);
      return sent
        ? t("encounter.selection.slot.missing", { slot, match: sent.providerMatchRef.externalId })
        : t("encounter.selection.slot.empty", { slot });
    }
    default: {
      const exhaustive: never = preview;
      return exhaustive;
    }
  }
}

export function SelectionHistory({
  actions,
  encounter,
  format,
  proposals,
  t,
}: {
  readonly actions: readonly OfficialSelectionActionDto[];
  readonly encounter: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  /** Resolves the proposal an operator chose to its label. */
  readonly proposals: readonly OfficialSelectionProposalDto[];
  readonly t: Translator;
}) {
  const teamName = teamNameIn(encounter, t);
  const by = (action: OfficialSelectionActionDto) =>
    action.capacity === "team"
      ? teamName(action.teamId)
      : t(
          action.capacity === "operator"
            ? "encounter.selection.history.byOperator"
            : "encounter.selection.history.bySystem",
        );
  const chosen = (action: OfficialSelectionActionDto) =>
    proposals.find((proposal) => proposal.id === action.details?.selectedProposalId);
  return (
    <ol
      aria-label={t("encounter.selection.history.title")}
      {...applyStyles(styles.history, styles.list)}
    >
      {[...actions].reverse().map((action) => {
        const selected = chosen(action);
        const acknowledged = action.details?.acknowledgedFlags?.length ?? 0;
        return (
          <li key={action.id} {...applyStyles(styles.summary)}>
            <Text tone="default" weight="medium">
              {t(`encounter.selection.history.action.${action.type}`)}
            </Text>
            <Caption>
              {by(action)} ·{" "}
              <time dateTime={action.occurredAt}>{format.format(new Date(action.occurredAt))}</time>
            </Caption>
            {selected ? (
              <Caption>
                {t("encounter.selection.history.selected", {
                  proposal: proposalLabel(selected, t),
                })}
              </Caption>
            ) : null}
            {acknowledged > 0 ? (
              <Caption>
                {t("encounter.selection.history.acknowledged", { count: acknowledged })}
              </Caption>
            ) : null}
            {action.reason ? <Text className={styles.reason}>{action.reason}</Text> : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * How the case ended last: the operator's latest resolution and, once approved, the
 * slots that became official and on what basis.
 */
export function SelectionOutcome({
  candidates,
  encounter,
  format,
  t,
  view,
}: SelectionRecordProps & { readonly candidates: readonly EncounterCandidateDto[] }) {
  const resolved = view.disputes.filter((dispute) => dispute.status === "resolved").at(-1);
  const approved = view.selection?.status === "approved" ? currentProposalOf(view) : null;
  const byOperator =
    approved !== null &&
    resolved?.resolution === "approved_proposal" &&
    resolved.resolutionProposalId === approved.id;
  if (!resolved && !approved) return null;
  return (
    <div {...applyStyles(styles.summary)}>
      {approved ? (
        <div aria-label={t("encounter.selection.outcome.approved")} role="group">
          <Text look="label">{t("encounter.selection.outcome.approved")}</Text>
          <Caption>
            {proposalLabel(approved, t)} ·{" "}
            {t(
              byOperator
                ? "encounter.selection.outcome.byOperator"
                : "encounter.selection.outcome.byAgreement",
            )}
          </Caption>
          <ProposalSlots
            candidates={candidates}
            encounter={encounter}
            slots={approved.slots}
            t={t}
          />
        </div>
      ) : null}
      {resolved?.resolution ? (
        <div aria-label={t("encounter.selection.outcome.resolution")} role="group">
          <Text look="label">{t("encounter.selection.outcome.resolution")}</Text>
          <Text tone="default">{t(`encounter.selection.outcome.${resolved.resolution}`)}</Text>
          {resolved.resolvedAt ? (
            <Caption>
              <time dateTime={resolved.resolvedAt}>
                {format.format(new Date(resolved.resolvedAt))}
              </time>
            </Caption>
          ) : null}
          {resolved.resolutionReason ? (
            <Text className={styles.reason}>{resolved.resolutionReason}</Text>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
