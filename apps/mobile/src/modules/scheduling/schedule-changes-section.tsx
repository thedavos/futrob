import { useState } from "react";
import { View } from "react-native";
import type {
  EncounterViewDto,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import {
  blockedScheduleChangeReasons,
  canResolveScheduleChange,
  currentScheduleChangeProposal,
  offeredScheduleChangeResponses,
  scheduleChangeCreationBlocks,
  scheduleChangeSummary,
  type ScheduleChangeResponseAction,
} from "@futrob/sdk";
import { useMobileCopy, type MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Button, Card, EmptyState, ErrorState, LoadingState, Text } from "@/ui";
import { CreateRequestDialog, ResponseDialog, type OnClosed } from "./reschedule-dialogs";
import { ResolveDialog } from "./resolve-dialog";
import { ScheduleChangeHistory } from "./schedule-change-history";
import { formatCompetitionInstant, rescheduleCopy, type RescheduleCopy } from "./reschedule-copy";
import { useEncounterScheduleChanges, type ScheduleChangesState } from "./use-schedule-changes";

type OpenDialog =
  | { readonly kind: "create" }
  | {
      readonly kind: "respond";
      readonly requestId: string;
      readonly action: ScheduleChangeResponseAction;
    }
  | { readonly kind: "resolve"; readonly requestId: string };

/**
 * The Encounter's schedule change requests, a section of the Match Center on web's Encounter
 * route. Request, counter, accept, reject and resolve are offered only where the server's
 * `creation`, `allowedActions` and `respondAs` allow them. Shares the Encounter read (same query
 * key) instead of fetching it twice.
 */
export function EncounterScheduleChanges({
  organizationId,
  competitionId,
  encounterId,
  view,
}: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly encounterId: string;
  readonly view: EncounterViewDto;
}) {
  const { language } = useMobileCopy();
  const { changes } = useEncounterScheduleChanges({ organizationId, competitionId, encounterId });
  return (
    <ScheduleChangesSection
      state={changes}
      view={view}
      copy={rescheduleCopy(language)}
      language={language}
    />
  );
}

function creationBlockText(
  creation: ScheduleChangeCreationOptionsDto,
  copy: RescheduleCopy,
  teamName: (teamId: string) => string,
): readonly string[] {
  return scheduleChangeCreationBlocks(creation).map((block) =>
    block.reason === "limit_reached"
      ? copy.create.blocked.limit_reached(teamName(block.teamId))
      : copy.create.blocked[block.reason],
  );
}

export function ScheduleChangesSection({
  state,
  view,
  copy,
  language,
}: {
  readonly state: ScheduleChangesState;
  readonly view: EncounterViewDto;
  readonly copy: RescheduleCopy;
  readonly language: MobileLanguage;
}) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const teamName = (id: string) =>
    id === view.home.teamId ? view.home.name : id === view.away.teamId ? view.away.name : id;
  const blocks = state.kind === "ready" ? creationBlockText(state.creation, copy, teamName) : [];
  const canCreate = state.kind === "ready" && blocks.length === 0;

  const open = (next: OpenDialog) => {
    setNotice(null);
    setDialog(next);
  };
  const onClosed: OnClosed = (message, outcome) => {
    setDialog(null);
    if (outcome === "sent") {
      setNotice(null);
      setAnnouncement(message);
    } else {
      setAnnouncement("");
      setNotice(message);
    }
  };

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <View style={{ gap: theme.spacing[2] }}>
        <Text role="title" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text role="caption" color="muted-foreground">
          {copy.description}
        </Text>
      </View>
      {state.kind === "ready" ? (
        <View style={{ gap: theme.spacing[2] }}>
          {canCreate ? (
            <Button label={copy.create.open} onPress={() => open({ kind: "create" })} />
          ) : null}
          <Button
            variant="outline"
            label={copy.refresh}
            loading={state.refreshing}
            onPress={state.refresh}
          />
        </View>
      ) : null}
      {announcement ? (
        <Text color="muted-foreground" accessibilityLiveRegion="polite">
          {announcement}
        </Text>
      ) : null}
      {notice ? (
        <Text color="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {notice}
        </Text>
      ) : null}
      {state.kind === "ready" && !canCreate && !state.refreshFailed
        ? blocks.map((reason) => (
            <Text key={reason} role="caption" color="muted-foreground">
              {reason}
            </Text>
          ))
        : null}
      {state.kind === "loading" ? <LoadingState label={copy.loading} rows={2} /> : null}
      {state.kind === "forbidden" ? <EmptyState title={copy.forbidden} /> : null}
      {state.kind === "error" ? (
        <ErrorState
          title={copy.error}
          retryLabel={copy.retry}
          onRetry={state.retry}
          retrying={state.retrying}
        />
      ) : null}
      {state.kind === "ready" && state.refreshFailed ? (
        <Text color="danger" accessibilityLiveRegion="polite">
          {copy.refreshFailed}
        </Text>
      ) : null}
      {state.kind === "ready" && state.requests.length === 0 ? (
        <EmptyState title={copy.empty} description={copy.emptyHelp} />
      ) : null}
      {state.kind === "ready"
        ? state.requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              view={view}
              copy={copy}
              language={language}
              teamName={teamName}
              refreshFailed={state.refreshFailed}
              onOpen={open}
            />
          ))
        : null}
      {state.kind === "ready" && dialog ? (
        <OpenedDialog
          dialog={dialog}
          state={state}
          view={view}
          copy={copy}
          language={language}
          teamName={teamName}
          canCreate={canCreate}
          onCancel={() => setDialog(null)}
          onClosed={onClosed}
        />
      ) : null}
    </View>
  );
}

function OpenedDialog({
  dialog,
  state,
  canCreate,
  ...shared
}: {
  readonly dialog: OpenDialog;
  readonly state: Extract<ScheduleChangesState, { kind: "ready" }>;
  readonly view: EncounterViewDto;
  readonly copy: RescheduleCopy;
  readonly language: MobileLanguage;
  readonly teamName: (teamId: string) => string;
  readonly canCreate: boolean;
  readonly onCancel: () => void;
  readonly onClosed: OnClosed;
}) {
  const props = { ...shared, paused: state.refreshFailed };
  if (dialog.kind === "create") {
    // A reread that blocks creation closes the draft, as web's form disappears.
    return canCreate ? (
      <CreateRequestDialog {...props} creation={state.creation} create={state.commands.create} />
    ) : null;
  }
  const request = state.requests.find((entry) => entry.id === dialog.requestId);
  if (!request) return null;
  if (dialog.kind === "resolve") {
    return canResolveScheduleChange(request) ? (
      <ResolveDialog
        key={`${request.id}:${request.version}`}
        {...props}
        request={request}
        resolve={state.commands.resolve}
      />
    ) : null;
  }
  return (
    <ResponseDialog {...props} action={dialog.action} request={request} commands={state.commands} />
  );
}

function RequestCard({
  request,
  view,
  copy,
  language,
  teamName,
  refreshFailed,
  onOpen,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly view: EncounterViewDto;
  readonly copy: RescheduleCopy;
  readonly language: MobileLanguage;
  readonly teamName: (teamId: string) => string;
  readonly refreshFailed: boolean;
  readonly onOpen: (dialog: OpenDialog) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const at = (instant: string) =>
    formatCompetitionInstant(instant, view.competition.timeZone, language);
  const proposal = currentScheduleChangeProposal(request);
  const scope =
    request.scope.type === "entire_encounter"
      ? copy.scopeEncounter
      : copy.scopeSlot(request.scope.officialSlot);
  const summary = scheduleChangeSummary(request, view);
  const proposer = teamName(proposal.proposedByTeamId);
  const sentence =
    summary.kind === "pending"
      ? copy.summary.pending(proposer, scope, at(summary.from), at(summary.to))
      : summary.kind === "applied"
        ? copy.summary.applied(scope, at(summary.from), at(summary.to))
        : copy.summary.closed(proposer, scope, at(summary.to));
  const offered = offeredScheduleChangeResponses(request);
  const blocked = blockedScheduleChangeReasons(request);
  const respondAs = request.respondAs;
  const responder = respondAs
    ? respondAs.authority === "organizer"
      ? copy.organizer
      : teamName(respondAs.teamId)
    : null;
  const deadline = at(proposal.responseDeadline);
  const canResolve = canResolveScheduleChange(request) && !refreshFailed;

  return (
    <Card>
      <View style={{ gap: theme.spacing[2] }}>
        <Text role="label" color={request.status === "escalated" ? "warning" : "muted-foreground"}>
          {copy.status[request.status]}
        </Text>
        <Text>{sentence}</Text>
        {request.status === "open" ? (
          <Text>{copy.respondBy(deadline)}</Text>
        ) : (
          <Text role="caption" color="muted-foreground">
            {copy.deadline(deadline)}
          </Text>
        )}
        <Text color="muted-foreground">{proposal.reason}</Text>
      </View>
      {offered.length > 0 ? (
        <View style={{ gap: theme.spacing[2] }}>
          {responder ? <Text role="label">{copy.respondAs(responder)}</Text> : null}
          {offered.map((action) => (
            <Button
              key={action}
              variant={action === "accept" ? "primary" : "outline"}
              label={copy.actions[action].open}
              onPress={() => onOpen({ kind: "respond", requestId: request.id, action })}
            />
          ))}
        </View>
      ) : null}
      {blocked.map((reason) => (
        <Text key={reason} role="caption" color="muted-foreground">
          {copy.blocked[reason]}
        </Text>
      ))}
      {canResolve ? (
        <Button
          variant="secondary"
          label={copy.resolve}
          onPress={() => onOpen({ kind: "resolve", requestId: request.id })}
        />
      ) : request.status === "escalated" && !request.allowedActions.includes("resolve") ? (
        <Text role="caption" color="muted-foreground">
          {copy.noPermission}
        </Text>
      ) : null}
      <Button
        variant="ghost"
        label={historyOpen ? copy.hideHistory : copy.history}
        accessibilityState={{ expanded: historyOpen }}
        onPress={() => setHistoryOpen((value) => !value)}
      />
      {historyOpen ? (
        <ScheduleChangeHistory request={request} copy={copy} at={at} teamName={teamName} />
      ) : null}
    </Card>
  );
}
