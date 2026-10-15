import type { ComponentProps } from "react";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionActionDto,
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

export function SelectionProposalList({
  candidates,
  encounter,
  format,
  t,
  view,
}: SelectionRecordProps & { readonly candidates: readonly EncounterCandidateDto[] }) {
  const teamName = teamNameIn(encounter, t);
  const currentId = view.selection?.currentProposalId ?? null;
  const proposals = [...view.proposals].sort(
    (a, b) => b.round - a.round || b.sequence - a.sequence,
  );
  return (
    <section aria-labelledby="selection-proposals" {...applyStyles(styles.summary)}>
      <Heading as="h3" id="selection-proposals">
        {t("encounter.selection.proposals.title")}
      </Heading>
      <ol {...applyStyles(styles.list)}>
        {proposals.map((proposal) => {
          const label = t("encounter.selection.proposal.label", {
            sequence: proposal.sequence,
            round: proposal.round,
          });
          return (
            <li aria-label={label} key={proposal.id} {...applyStyles(styles.item)}>
              <div {...applyStyles(styles.inline)}>
                <Text tone="default" weight="medium">
                  {label}
                </Text>
                <Badge variant={proposal.id === currentId ? "emphasis" : "outline"}>
                  {t(
                    proposal.id === currentId
                      ? "encounter.selection.proposal.current"
                      : "encounter.selection.proposal.superseded",
                  )}
                </Badge>
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

/** Each slot resolved to its candidate's score; the provider reference when it is gone. */
export function ProposalSlots({
  candidates,
  encounter,
  slots,
  t,
}: {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly encounter: EncounterViewDto;
  readonly slots: readonly SlotSelection[];
  readonly t: Translator;
}) {
  const previews = previewEncounter(encounter, candidates, assignmentsOf(slots)).slots;
  return <SlotLines encounter={encounter} previews={previews} sent={slots} t={t} />;
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
  t,
}: {
  readonly actions: readonly OfficialSelectionActionDto[];
  readonly encounter: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
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
  return (
    <ol
      aria-label={t("encounter.selection.history.title")}
      {...applyStyles(styles.history, styles.list)}
    >
      {[...actions].reverse().map((action) => (
        <li key={action.id} {...applyStyles(styles.summary)}>
          <Text tone="default" weight="medium">
            {t(`encounter.selection.history.action.${action.type}`)}
          </Text>
          <Caption>
            {by(action)} ·{" "}
            <time dateTime={action.occurredAt}>{format.format(new Date(action.occurredAt))}</time>
          </Caption>
          {action.reason ? <Text className={styles.reason}>{action.reason}</Text> : null}
        </li>
      ))}
    </ol>
  );
}
