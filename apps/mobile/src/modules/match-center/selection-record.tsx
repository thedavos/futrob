import { useState } from "react";
import { View } from "react-native";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionProposalDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import {
  assignmentsOf,
  currentProposalOf,
  previewEncounter,
  type SelectionRead,
  type SlotPreview,
  type SlotSelection,
  type Submission,
} from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Button, Card, Text } from "@/ui";
import type { MatchCenterCopy } from "./match-center-copy";
import { outcomeText } from "./match-center-parts";

/** What the Team panel and the organization review both show of a persisted selection. */
export type Shared = {
  readonly view: EncounterViewDto;
  readonly copy: MatchCenterCopy;
  readonly language: MobileLanguage;
  readonly candidates: readonly EncounterCandidateDto[];
  readonly at: (iso: string) => string;
};

export type Ready<Intent> = Extract<SelectionRead<Intent>, { kind: "ready" }>;

export const teamNameOf =
  (view: EncounterViewDto, copy: MatchCenterCopy) => (teamId: string | null) =>
    teamId === view.home.teamId
      ? view.home.name
      : teamId === view.away.teamId
        ? view.away.name
        : copy.teamUnknown;

export function RefreshRow<Intent>({
  label,
  failed,
  read,
}: {
  readonly label: string;
  readonly failed: string | null;
  readonly read: Ready<Intent>;
}) {
  return (
    <>
      <Button variant="outline" label={label} loading={read.refreshing} onPress={read.refresh} />
      {failed ? (
        <Text color="warning" accessibilityLiveRegion="polite">
          {failed}
        </Text>
      ) : null}
    </>
  );
}

export function SubmissionNotice<Intent>({
  submission,
  copy,
  currentVersion,
  available,
}: {
  readonly submission: Submission<Intent>;
  readonly copy: MatchCenterCopy;
  readonly currentVersion: number;
  readonly available: boolean;
}) {
  const message = (() => {
    switch (submission.status) {
      case "conflict":
        return copy.conflict(submission.readVersion, currentVersion);
      case "unknown":
        return copy.unknown;
      case "invalid":
        return copy.invalidMessage(submission.code);
      case "idle":
      case "pending":
      case "refused":
        return available ? null : copy.unavailable;
      default: {
        const exhaustive: never = submission;
        return exhaustive;
      }
    }
  })();
  if (!message) return null;
  return (
    <Text color="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {message}
    </Text>
  );
}

export function SelectionSummary({
  selection,
  view,
  copy,
  at,
}: Shared & { readonly selection: OfficialSelectionViewDto }) {
  const status = selection.selection?.status ?? "none";
  const current = currentProposalOf(selection);
  const dispute = selection.activeDispute;
  const teamName = teamNameOf(view, copy);
  return (
    <Card>
      <Text role="label" color={status === "approved" ? "primary" : "foreground"}>
        {copy.status[status]}
      </Text>
      {selection.selection ? (
        <Text role="caption" color="muted-foreground">
          {copy.version(selection.selection.version)}
        </Text>
      ) : null}
      {status === "awaiting_opponent_confirmation" && current ? (
        <Text>{copy.deadline(at(current.confirmationDeadline))}</Text>
      ) : null}
      <Text role="caption" color="muted-foreground">
        {selection.approvedResultId ? copy.approved : copy.notOfficial}
      </Text>
      {dispute ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{`${copy.disputeTitle} · ${copy.disputeStatus[dispute.status]}`}</Text>
          <Text role="caption" color="muted-foreground">
            {copy.disputeOpenedBy(teamName(dispute.openedByTeamId))}
          </Text>
          <Text>{dispute.openedReason}</Text>
        </View>
      ) : null}
      {selection.integrityFlags.length > 0 ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{copy.flagsTitle}</Text>
          {selection.integrityFlags.map((flag) => (
            <Text key={`${flag.code}:${flag.providerMatchRef.externalId}`} color="warning">
              {copy.flag[flag.code](flag.providerMatchRef.externalId)}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function ProposalSlots({
  proposal,
  ...shared
}: Shared & { readonly proposal: OfficialSelectionProposalDto }) {
  const { view, copy, candidates } = shared;
  const preview = previewEncounter(view, candidates, assignmentsOf(proposal.slots));
  return (
    <View style={{ gap: theme.spacing[1] }}>
      <SlotLines {...shared} previews={preview.slots} sent={proposal.slots} />
      {preview.series.kind === "single" || preview.series.kind === "aggregate" ? (
        <Text role="caption" color="muted-foreground">
          {outcomeText(preview.series.outcome, view, copy)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * One line per official slot: what it counts and which EA match backs it. Matches between the
 * same clubs can share a score, so the reference and when it was played tell them apart; a
 * proposal whose candidate is gone still names the reference it sent.
 */
export function SlotLines({
  previews,
  sent = [],
  view,
  copy,
  at,
}: Pick<Shared, "view" | "copy" | "at"> & {
  readonly previews: readonly SlotPreview[];
  readonly sent?: readonly SlotSelection[];
}) {
  return (
    <View style={{ gap: theme.spacing[1] }}>
      {previews.map((preview) => {
        const line = slotLine(preview, sent, view, copy, at);
        return (
          <View key={preview.slot}>
            <Text>{line.summary}</Text>
            {line.match ? (
              <Text role="caption" color="muted-foreground">
                {line.match}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** What one official slot counts, and which EA match backs it when one does. */
type SlotLine = { readonly summary: string; readonly match: string | null };

function slotLine(
  preview: SlotPreview,
  sent: readonly SlotSelection[],
  view: EncounterViewDto,
  copy: MatchCenterCopy,
  at: (iso: string) => string,
): SlotLine {
  const slot = preview.slot;
  switch (preview.kind) {
    case "scored":
      return {
        summary: copy.slotScore(
          slot,
          view.home.name,
          preview.score.home,
          preview.score.away,
          view.away.name,
        ),
        match: copy.slotPlayed(
          preview.candidate.reference.externalId,
          at(preview.candidate.occurredAt),
        ),
      };
    case "unmatched":
      return {
        summary: copy.slotUnmatchedScore(slot),
        match: copy.slotPlayed(
          preview.candidate.reference.externalId,
          at(preview.candidate.occurredAt),
        ),
      };
    case "unassigned": {
      const selection = sent.find((row) => row.officialSlot === slot);
      return selection
        ? {
            summary: copy.slotMissing(slot),
            match: copy.slotMatch(selection.providerMatchRef.externalId),
          }
        : { summary: `${copy.slot(slot)}: ${copy.slotUnassigned}`, match: null };
    }
    default: {
      const exhaustive: never = preview;
      return exhaustive;
    }
  }
}

export function ProposalList({
  selection,
  ...shared
}: Shared & { readonly selection: OfficialSelectionViewDto }) {
  const { copy, view, at } = shared;
  const teamName = teamNameOf(view, copy);
  if (selection.proposals.length === 0) return null;
  const currentId = selection.selection?.currentProposalId;
  const proposals = [...selection.proposals].sort(
    (a, b) => b.round - a.round || b.sequence - a.sequence,
  );
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Text role="subtitle" accessibilityRole="header">
        {copy.proposalsTitle}
      </Text>
      {proposals.map((proposal) => (
        <Card key={proposal.id}>
          <Text role="label">
            {proposal.id === currentId
              ? `${copy.proposalLabel(proposal.sequence, proposal.round)} · ${copy.proposalCurrent}`
              : copy.proposalLabel(proposal.sequence, proposal.round)}
          </Text>
          <Text role="caption" color="muted-foreground">
            {`${copy.proposalBy(teamName(proposal.proposingTeamId))} · ${at(proposal.createdAt)}`}
          </Text>
          <ProposalSlots {...shared} proposal={proposal} />
          {proposal.reason ? <Text color="muted-foreground">{proposal.reason}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

export function History({
  selection,
  view,
  copy,
  at,
}: Shared & { readonly selection: OfficialSelectionViewDto }) {
  const [open, setOpen] = useState(false);
  const teamName = teamNameOf(view, copy);
  if (selection.actions.length === 0) return null;
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Button
        variant="ghost"
        label={open ? copy.historyHide : copy.historyTitle}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
      />
      {open
        ? [...selection.actions].reverse().map((action) => (
            <View key={action.id} style={{ gap: theme.spacing[1] }}>
              <Text role="label">{copy.history[action.type]}</Text>
              <Text role="caption" color="muted-foreground">
                {`${
                  action.capacity === "team"
                    ? teamName(action.teamId)
                    : action.capacity === "operator"
                      ? copy.historyByOperator
                      : copy.historyBySystem
                } · ${at(action.occurredAt)}`}
              </Text>
              {action.reason ? <Text>{action.reason}</Text> : null}
            </View>
          ))
        : null}
    </View>
  );
}
