import { useReducer, useState, type Dispatch } from "react";
import { Pressable, View } from "react-native";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  acknowledgementRequired,
  approvableProposals,
  buildOperatorIntent,
  EMPTY_OPERATOR_DRAFT,
  flagsFor,
  operatorCommandsFor,
  operatorDraftReducer,
  OPERATOR_COMMANDS,
  readVersionOf,
  REASON_MAX_LENGTH,
  type OperatorCommand,
  type OperatorDraft,
  type OperatorDraftEvent,
  type OperatorIntent,
  type SelectionRead,
} from "@futrob/sdk";
import { theme } from "@/theme/theme";
import { Button, Dialog, ErrorState, Icon, Input, LoadingState, Text } from "@/ui";
import { SectionHeading } from "./match-center-parts";
import {
  History,
  ProposalList,
  ProposalSlots,
  RefreshRow,
  SelectionSummary,
  SubmissionNotice,
  teamNameOf,
  type Ready,
  type Shared,
} from "./selection-record";
import { useCommandAttempt, type ReviewPanelState } from "./use-match-center";

export function ReviewSection({ state, ...shared }: Shared & { readonly state: ReviewPanelState }) {
  const { copy } = shared;
  const [draft, dispatch] = useReducer(operatorDraftReducer, EMPTY_OPERATOR_DRAFT);
  if (state.kind === "hidden") return null;
  const read: SelectionRead<OperatorIntent> =
    draft.submission.status === "refused" ? { kind: "forbidden" } : state.read;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <SectionHeading title={copy.reviewTitle} description={copy.reviewDescription} />
      <Text accessibilityLiveRegion="polite" role="label">
        {draft.accepted && !draft.open ? copy.review[draft.accepted].success : ""}
      </Text>
      {read.kind === "loading" ? <LoadingState label={copy.reviewLoading} rows={2} /> : null}
      {read.kind === "forbidden" ? <Text>{copy.reviewForbidden}</Text> : null}
      {read.kind === "error" ? (
        <ErrorState title={copy.reviewError} retryLabel={copy.retry} onRetry={read.retry} />
      ) : null}
      {read.kind === "ready" ? (
        <ReviewReady {...shared} read={read} draft={draft} dispatch={dispatch} />
      ) : null}
    </View>
  );
}

function ReviewReady({
  read,
  draft,
  dispatch,
  ...shared
}: Shared & {
  readonly read: Ready<OperatorIntent>;
  readonly draft: OperatorDraft;
  readonly dispatch: Dispatch<OperatorDraftEvent>;
}) {
  const { copy } = shared;
  const send = useCommandAttempt<OperatorCommand, OperatorIntent>(dispatch);
  const { view } = read;
  const allowed = operatorCommandsFor(view);
  const readVersion = readVersionOf(view);

  function submit(command: OperatorCommand) {
    const checked = buildOperatorIntent(command, view, draft.input, draft.submission);
    if (!checked.ok) return checked.missing;
    if (allowed.includes(command)) send(draft.submission, checked.intent, readVersion, read.submit);
    return null;
  }

  return (
    <>
      <RefreshRow
        label={copy.reviewRefresh}
        failed={read.refreshFailed ? copy.reviewRefreshFailed : null}
        read={read}
      />
      <SelectionSummary {...shared} selection={view} />
      {allowed.length > 0 ? (
        <View style={{ gap: theme.spacing[2] }}>
          {OPERATOR_COMMANDS.filter((command) => allowed.includes(command)).map((command) => (
            <Button
              key={command}
              variant={command === "approve_proposal" ? "primary" : "outline"}
              label={copy.review[command].trigger}
              onPress={() => dispatch({ type: "open", command })}
            />
          ))}
        </View>
      ) : (
        <Text role="caption" color="muted-foreground">
          {copy.reviewNoCommands}
        </Text>
      )}
      {draft.open ? (
        <ReviewDialog
          {...shared}
          key={draft.open}
          command={draft.open}
          available={allowed.includes(draft.open)}
          draft={draft}
          dispatch={dispatch}
          selection={view}
          onSubmit={() => submit(draft.open!)}
        />
      ) : null}
      {view.proposals.length === 0 ? (
        <Text role="caption" color="muted-foreground">
          {copy.reviewEmpty}
        </Text>
      ) : (
        <ProposalList {...shared} selection={view} />
      )}
      <History {...shared} selection={view} />
    </>
  );
}

function ReviewDialog({
  command,
  available,
  draft,
  dispatch,
  selection,
  onSubmit,
  ...shared
}: Shared & {
  readonly command: OperatorCommand;
  readonly available: boolean;
  readonly draft: OperatorDraft;
  readonly dispatch: Dispatch<OperatorDraftEvent>;
  readonly selection: OfficialSelectionViewDto;
  readonly onSubmit: () => "proposal" | "acknowledgement" | "reason" | null;
}) {
  const { copy } = shared;
  const [missing, setMissing] = useState<"proposal" | "acknowledgement" | "reason" | null>(null);
  const text = copy.review[command];
  const pending = draft.submission.status === "pending";
  const { input } = draft;
  const approving = command === "approve_proposal";
  const flags = approving ? flagsFor(selection, input.proposalId) : [];
  const needsAck = approving && acknowledgementRequired(selection, input, draft.submission);
  const teamName = teamNameOf(shared.view, copy);

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
      {approving ? (
        <View style={{ gap: theme.spacing[2] }} accessibilityRole="radiogroup">
          <Text role="label">{copy.reviewChoose}</Text>
          {approvableProposals(selection).map((proposal) => {
            const chosen = input.proposalId === proposal.id;
            return (
              <Pressable
                key={proposal.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen, disabled: pending }}
                accessibilityLabel={`${copy.proposalLabel(proposal.sequence, proposal.round)}, ${copy.proposalBy(teamName(proposal.proposingTeamId))}`}
                disabled={pending}
                onPress={() => dispatch({ type: "choose_proposal", proposalId: proposal.id })}
                style={{
                  minHeight: theme.controlHeight,
                  borderRadius: theme.corner.md,
                  borderWidth: 1,
                  borderColor: chosen ? theme.colors.primary : theme.colors.border,
                  padding: theme.spacing[3],
                  gap: theme.spacing[1],
                }}
              >
                <View style={{ flexDirection: "row", gap: theme.spacing[2], alignItems: "center" }}>
                  {chosen ? <Icon name="check" color="primary" size={18} /> : null}
                  <Text role="label">
                    {`${copy.proposalLabel(proposal.sequence, proposal.round)} · ${copy.proposalBy(teamName(proposal.proposingTeamId))}`}
                  </Text>
                </View>
                <ProposalSlots {...shared} proposal={proposal} />
              </Pressable>
            );
          })}
          {missing === "proposal" ? (
            <Text color="danger" accessibilityRole="alert">
              {copy.reviewChooseRequired}
            </Text>
          ) : null}
        </View>
      ) : null}
      {flags.length > 0 ? (
        <View style={{ gap: theme.spacing[1] }}>
          <Text role="label">{copy.reviewFlags}</Text>
          {flags.map((flag) => (
            <Text key={`${flag.code}:${flag.providerMatchRef.externalId}`} color="warning">
              {copy.flag[flag.code](flag.providerMatchRef.externalId)}
            </Text>
          ))}
        </View>
      ) : null}
      {needsAck ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: input.acknowledged, disabled: pending }}
          accessibilityLabel={copy.reviewAcknowledge}
          disabled={pending}
          onPress={() => dispatch({ type: "acknowledge", acknowledged: !input.acknowledged })}
          style={{
            minHeight: theme.controlHeight,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing[3],
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: theme.corner.sm,
              borderWidth: 1,
              borderColor: input.acknowledged ? theme.colors.primary : theme.colors.input,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {input.acknowledged ? <Icon name="check" color="primary" size={16} /> : null}
          </View>
          <Text style={{ flex: 1 }}>{copy.reviewAcknowledge}</Text>
        </Pressable>
      ) : null}
      {missing === "acknowledgement" ? (
        <Text color="danger" accessibilityRole="alert">
          {copy.reviewAcknowledgeRequired}
        </Text>
      ) : null}
      <Input
        label={copy.reasonLabel}
        hint={copy.reviewReasonHelp}
        error={missing === "reason" ? copy.reasonRequired : null}
        multiline
        maxLength={REASON_MAX_LENGTH}
        value={input.reasons[command]}
        editable={!pending}
        onChangeText={(value) => dispatch({ type: "edit_reason", command, text: value })}
      />
      <SubmissionNotice
        submission={draft.submission}
        copy={copy}
        currentVersion={readVersionOf(selection)}
        available={available}
      />
    </Dialog>
  );
}
