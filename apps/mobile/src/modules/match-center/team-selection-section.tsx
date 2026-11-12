import { useState, type Dispatch } from "react";
import { View } from "react-native";
import type { OfficialSelectionProposalDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  buildTeamIntent,
  currentProposalOf,
  needsReason,
  needsSlots,
  readVersionOf,
  REASON_MAX_LENGTH,
  selectionsFor,
  teamCommandsFor,
  type EncounterPreview,
  type SelectionRead,
  type TeamCommand,
  type TeamDraft,
  type TeamDraftEvent,
  type TeamIntent,
} from "@futrob/sdk";
import { theme } from "@/theme/theme";
import { Button, Dialog, ErrorState, Input, LoadingState, Tabs, Text } from "@/ui";
import { SectionHeading } from "./match-center-parts";
import {
  History,
  ProposalList,
  ProposalSlots,
  RefreshRow,
  SelectionSummary,
  SubmissionNotice,
  type Ready,
  type Shared,
} from "./selection-record";
import { useCommandAttempt, type TeamPanelState } from "./use-match-center";

export function TeamSelectionSection({
  state,
  draft,
  dispatch,
  preview,
  ...shared
}: Shared & {
  readonly state: TeamPanelState;
  readonly draft: TeamDraft;
  readonly dispatch: Dispatch<TeamDraftEvent>;
  readonly preview: EncounterPreview;
}) {
  const { view, copy } = shared;
  if (state.kind === "hidden") return null;
  // A refused command means the server no longer lets this actor speak for the Team.
  const read: SelectionRead<TeamIntent> =
    draft.submission.status === "refused" ? { kind: "forbidden" } : state.read;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeading title={copy.selectionTitle} description={copy.selectionDescription} />
      <Text accessibilityLiveRegion="polite" role="label">
        {draft.accepted && !draft.open ? copy.command[draft.accepted].success : ""}
      </Text>
      {state.sides.length < 2 ? (
        <Text role="label">{`${copy.actingAs}: ${view[state.side].name}`}</Text>
      ) : (
        <View style={{ gap: theme.spacing[2] }}>
          <Text role="label">{copy.actingAs}</Text>
          <Tabs
            label={copy.actingAs}
            variant="pills"
            value={state.side}
            onChange={state.choose}
            items={state.sides.map((side) => ({ id: side, label: view[side].name }))}
          />
        </View>
      )}
      {read.kind === "loading" ? <LoadingState label={copy.selectionLoading} rows={2} /> : null}
      {read.kind === "forbidden" ? <Text>{copy.selectionForbidden}</Text> : null}
      {read.kind === "error" ? (
        <ErrorState title={copy.selectionError} retryLabel={copy.retry} onRetry={read.retry} />
      ) : null}
      {read.kind === "ready" ? (
        <TeamReady
          {...shared}
          read={read}
          draft={draft}
          dispatch={dispatch}
          preview={preview}
          actingTeamId={view[state.side].teamId}
        />
      ) : null}
    </View>
  );
}

function TeamReady({
  read,
  draft,
  dispatch,
  preview,
  actingTeamId,
  ...shared
}: Shared & {
  readonly read: Ready<TeamIntent>;
  readonly draft: TeamDraft;
  readonly dispatch: Dispatch<TeamDraftEvent>;
  readonly preview: EncounterPreview;
  readonly actingTeamId: string;
}) {
  const { view: encounter, copy, candidates } = shared;
  const send = useCommandAttempt<TeamCommand, TeamIntent>(dispatch);
  const { view } = read;
  const allowed = teamCommandsFor(view, actingTeamId);
  const target = currentProposalOf(view);
  const readVersion = readVersionOf(view);

  function submit(command: TeamCommand) {
    const checked = buildTeamIntent(command, {
      proposalId: target?.id ?? null,
      selections: selectionsFor(encounter, candidates, draft.input.assignments),
      reason: needsReason(command) ? draft.input.reasons[command] : "",
    });
    if (!checked.ok) return checked.missing;
    if (allowed.includes(command)) send(draft.submission, checked.intent, readVersion, read.submit);
    return null;
  }

  return (
    <>
      <RefreshRow
        label={copy.selectionRefresh}
        failed={read.refreshFailed ? copy.selectionRefreshFailed : null}
        read={read}
      />
      <SelectionSummary {...shared} selection={view} />
      {view.selection === null ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{copy.selectionEmptyTitle}</Text>
          <Text role="caption" color="muted-foreground">
            {copy.selectionEmptyDescription}
          </Text>
        </View>
      ) : null}
      {allowed.length > 0 ? (
        <View style={{ gap: theme.spacing[2] }}>
          {allowed.map((command) => (
            <Button
              key={command}
              variant={command === "confirm" || command === "propose" ? "primary" : "outline"}
              label={copy.command[command].trigger}
              onPress={() => dispatch({ type: "open", command })}
            />
          ))}
        </View>
      ) : (
        <Text role="caption" color="muted-foreground">
          {copy.noCommands}
        </Text>
      )}
      {draft.open ? (
        <TeamCommandDialog
          {...shared}
          key={draft.open}
          command={draft.open}
          available={allowed.includes(draft.open)}
          draft={draft}
          dispatch={dispatch}
          preview={preview}
          target={target}
          selection={view}
          onSubmit={() => submit(draft.open!)}
        />
      ) : null}
      <ProposalList {...shared} selection={view} />
      <History {...shared} selection={view} />
    </>
  );
}

function TeamCommandDialog({
  command,
  available,
  draft,
  dispatch,
  preview,
  target,
  selection,
  onSubmit,
  ...shared
}: Shared & {
  readonly command: TeamCommand;
  readonly available: boolean;
  readonly draft: TeamDraft;
  readonly dispatch: Dispatch<TeamDraftEvent>;
  readonly preview: EncounterPreview;
  readonly target: OfficialSelectionProposalDto | null;
  readonly selection: OfficialSelectionViewDto;
  readonly onSubmit: () => "slots" | "reason" | "proposal" | null;
}) {
  const { copy, view } = shared;
  const [missing, setMissing] = useState<"slots" | "reason" | "proposal" | null>(null);
  const text = copy.command[command];
  const pending = draft.submission.status === "pending";
  const responds = command !== "propose" && command !== "open_dispute";

  return (
    <Dialog
      open
      onClose={() => dispatch({ type: "close" })}
      title={text.title}
      description={text.description}
      closeLabel={copy.close}
      actions={
        <>
          <Button
            label={draft.submission.status === "unknown" ? copy.retry : text.submit}
            loading={pending}
            disabled={!available}
            variant={command === "reject" || command === "open_dispute" ? "destructive" : "primary"}
            onPress={() => setMissing(onSubmit())}
          />
          <Button
            variant="outline"
            label={copy.cancel}
            disabled={pending}
            onPress={() => dispatch({ type: "close" })}
          />
        </>
      }
    >
      {responds && target ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{copy.dialogTarget}</Text>
          <ProposalSlots {...shared} proposal={target} />
        </View>
      ) : null}
      {needsSlots(command) ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{copy.dialogSlots}</Text>
          {preview.slots.map((slot) => (
            <Text key={slot.slot}>
              {slot.kind === "scored"
                ? copy.slotScore(
                    slot.slot,
                    view.home.name,
                    slot.score.home,
                    slot.score.away,
                    view.away.name,
                  )
                : slot.kind === "unmatched"
                  ? copy.slotUnmatchedScore(slot.slot)
                  : `${copy.slot(slot.slot)}: ${copy.slotUnassigned}`}
            </Text>
          ))}
          {missing === "slots" ? (
            <Text color="danger" accessibilityRole="alert">
              {copy.dialogSlotsIncomplete}
            </Text>
          ) : null}
        </View>
      ) : null}
      {needsReason(command) ? (
        <Input
          label={copy.reasonLabel}
          hint={copy.reasonHelp}
          error={missing === "reason" ? copy.reasonRequired : null}
          multiline
          maxLength={REASON_MAX_LENGTH}
          value={draft.input.reasons[command]}
          editable={!pending}
          onChangeText={(text) => dispatch({ type: "edit_reason", command, text })}
        />
      ) : null}
      <SubmissionNotice
        submission={draft.submission}
        copy={copy}
        currentVersion={readVersionOf(selection)}
        available={available}
      />
    </Dialog>
  );
}
