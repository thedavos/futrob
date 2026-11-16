import { useRef, useState } from "react";
import type {
  EncounterViewDto,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import {
  counterProposalTeamId,
  currentScheduleChangeProposal,
  FutrobApiError,
  isScheduleChangeDraftStale,
  parseCompetitionWallTime,
  rescheduleScopeKey,
  scheduleChangeCurrentStart,
  scheduleChangeRecovery,
  type ScheduleChangeRecovery,
  type ScheduleChangeResponseAction,
  type WallTimeFields,
} from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { Button, Dialog, Text } from "@/ui";
import { formatCompetitionInstant, type RescheduleCopy } from "./reschedule-copy";
import {
  ChoiceGroup,
  ReasonField,
  useCommandKey,
  WallTimeField,
  wallTimeInstant,
} from "./reschedule-fields";
import type { ScheduleChangeCommands } from "./use-schedule-changes";

/** The dialog closed after a command: announce success, or explain a refusal on the screen. */
export type OnClosed = (message: string, outcome: "sent" | "refused") => void;

export interface Shared {
  readonly copy: RescheduleCopy;
  readonly language: MobileLanguage;
  readonly view: EncounterViewDto;
  readonly teamName: (teamId: string) => string;
  /** The last reread failed: keep the draft and its key, but send only after a good read. */
  readonly paused: boolean;
  readonly onCancel: () => void;
  readonly onClosed: OnClosed;
}

const EMPTY_WALL_TIME: WallTimeFields = { date: "", time: "" };

export function Problem({ children }: { readonly children: string }) {
  return (
    <Text color="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {children}
    </Text>
  );
}

export function Note({ children }: { readonly children: string }) {
  return (
    <Text role="caption" color="muted-foreground" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

const recoveryText = (copy: RescheduleCopy, recovery: ScheduleChangeRecovery) =>
  copy.recovery[recovery.message];

export function CreateRequestDialog({
  creation,
  create,
  ...shared
}: Shared & {
  readonly creation: ScheduleChangeCreationOptionsDto;
  readonly create: ScheduleChangeCommands["create"];
}) {
  const { copy, language, view, teamName, paused, onCancel, onClosed } = shared;
  const timeZone = view.competition.timeZone;
  const at = (instant: string) => formatCompetitionInstant(instant, timeZone, language);
  const [teamId, setTeamId] = useState(
    () => creation.teams.find((team) => !team.blockedReason)?.teamId ?? "",
  );
  const [scope, setScope] = useState(() => {
    const open = creation.scopes.find((option) => !option.blockedReason);
    return open ? rescheduleScopeKey(open.scope) : "";
  });
  const [wallTime, setWallTime] = useState(EMPTY_WALL_TIME);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState<"date" | "reason" | null>(null);
  const [failure, setFailure] = useState<ScheduleChangeRecovery | null>(null);
  const inFlight = useRef(false);
  const commandKey = useCommandKey();

  async function submit() {
    if (inFlight.current || paused) return;
    setFailure(null);
    const proposedWallTime = parseCompetitionWallTime(wallTime);
    if (!proposedWallTime || !wallTimeInstant(wallTime, timeZone)) return setInvalid("date");
    const trimmed = reason.trim();
    if (!trimmed) return setInvalid("reason");
    setInvalid(null);
    const option = creation.scopes.find((entry) => rescheduleScopeKey(entry.scope) === scope);
    if (!option) return;
    const payload = {
      requestingTeamId: teamId,
      scope: option.scope,
      proposedWallTime,
      reason: trimmed,
      timeZone,
    };
    inFlight.current = true;
    setPending(true);
    let failed: ScheduleChangeRecovery | null = null;
    try {
      await create({ ...payload, idempotencyKey: commandKey(payload) });
    } catch (cause) {
      failed = scheduleChangeRecovery(cause instanceof FutrobApiError ? cause : null, "create");
    }
    inFlight.current = false;
    if (!failed) return onClosed(copy.create.success, "sent");
    if (failed.draft === "close") return onClosed(recoveryText(copy, failed), "refused");
    setPending(false);
    setFailure(failed);
  }

  const dateError =
    invalid === "date"
      ? copy.dateInvalid
      : failure?.field === "date"
        ? recoveryText(copy, failure)
        : null;
  const scopeLabel = (option: ScheduleChangeCreationOptionsDto["scopes"][number]) =>
    option.scope.type === "entire_encounter"
      ? copy.scopeEncounter
      : copy.scopeSlot(option.scope.officialSlot);

  return (
    <Dialog
      open
      onClose={pending ? () => undefined : onCancel}
      title={copy.create.title}
      description={copy.create.help}
      closeLabel={copy.close}
      actions={
        <>
          <Button
            label={copy.create.submit}
            loading={pending}
            disabled={paused}
            onPress={() => void submit()}
          />
          <Button variant="ghost" label={copy.cancel} disabled={pending} onPress={onCancel} />
        </>
      }
    >
      {creation.teams.length > 1 ? (
        <ChoiceGroup
          label={copy.create.team}
          value={teamId}
          onChange={setTeamId}
          disabled={pending}
          choices={creation.teams.map((team) => ({
            value: team.teamId,
            label: teamName(team.teamId),
            disabled: team.blockedReason !== null,
            description: team.blockedReason
              ? copy.create.blocked.limit_reached(teamName(team.teamId))
              : undefined,
          }))}
        />
      ) : null}
      <Text style={{ fontWeight: "500" }}>{copy.create.actingAs(teamName(teamId))}</Text>
      <ChoiceGroup
        label={copy.create.scope}
        value={scope}
        onChange={setScope}
        disabled={pending}
        choices={creation.scopes.map((option) => ({
          value: rescheduleScopeKey(option.scope),
          label: scopeLabel(option),
          disabled: option.blockedReason !== null,
          description: option.blockedReason
            ? copy.create.blocked[option.blockedReason]
            : copy.create.currentStart(at(option.currentStartAt)),
        }))}
      />
      <WallTimeField
        copy={copy}
        language={language}
        value={wallTime}
        onChange={setWallTime}
        timeZone={timeZone}
        error={dateError}
        disabled={pending}
      />
      <ReasonField
        label={copy.create.reason}
        value={reason}
        onChange={setReason}
        error={invalid === "reason" ? copy.create.reasonRequired : null}
        disabled={pending}
      />
      {failure && failure.field === null ? <Problem>{recoveryText(copy, failure)}</Problem> : null}
      {paused ? <Note>{copy.paused}</Note> : null}
    </Dialog>
  );
}

/** The proposal a draft answers, captured when it opens. */
interface Target {
  readonly proposalId: string;
  readonly version: number;
}

export function ResponseDialog({
  action,
  request,
  commands,
  ...shared
}: Shared & {
  readonly action: ScheduleChangeResponseAction;
  readonly request: ScheduleChangeRequestDto;
  readonly commands: Pick<ScheduleChangeCommands, ScheduleChangeResponseAction>;
}) {
  const { copy, language, view, teamName, paused, onCancel, onClosed } = shared;
  const timeZone = view.competition.timeZone;
  const at = (instant: string) => formatCompetitionInstant(instant, timeZone, language);
  const [target] = useState<Target>(() => ({
    proposalId: request.currentProposalId,
    version: request.version,
  }));
  const [wallTime, setWallTime] = useState(EMPTY_WALL_TIME);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState<"date" | "reason" | null>(null);
  const [failure, setFailure] = useState<ScheduleChangeRecovery | null>(null);
  const inFlight = useRef(false);
  const commandKey = useCommandKey();

  const proposal = currentScheduleChangeProposal(request);
  const rivalTeamId = counterProposalTeamId(request, view);
  const currentStart = scheduleChangeCurrentStart(request.scope, view);
  const stale = !pending && isScheduleChangeDraftStale(request, target, action);
  const scope =
    request.scope.type === "entire_encounter"
      ? copy.scopeEncounter
      : copy.scopeSlot(request.scope.officialSlot);

  async function submit() {
    if (inFlight.current || stale || paused) return;
    setFailure(null);
    const proposalTarget = { requestId: request.id, proposalId: target.proposalId };
    const expectedVersion = target.version;
    let send: () => Promise<void>;
    if (action === "counter") {
      const proposedWallTime = parseCompetitionWallTime(wallTime);
      if (!proposedWallTime || !wallTimeInstant(wallTime, timeZone)) return setInvalid("date");
      const trimmed = reason.trim();
      if (!trimmed) return setInvalid("reason");
      const body = {
        expectedVersion,
        teamId: rivalTeamId,
        proposedWallTime,
        reason: trimmed,
        timeZone,
      };
      const key = commandKey({ ...proposalTarget, action, ...body });
      send = () => commands.counter(proposalTarget, { ...body, commandKey: key });
    } else {
      const respondAs = request.respondAs;
      if (!respondAs) return;
      const rejectReason = action === "reject" ? reason.trim() || undefined : undefined;
      const body = { expectedVersion, responder: respondAs };
      const key = commandKey({ ...proposalTarget, action, ...body, reason: rejectReason });
      send =
        action === "accept"
          ? () => commands.accept(proposalTarget, { ...body, commandKey: key })
          : () =>
              commands.reject(proposalTarget, { ...body, reason: rejectReason, commandKey: key });
    }
    setInvalid(null);
    inFlight.current = true;
    setPending(true);
    let failed: ScheduleChangeRecovery | null = null;
    try {
      await send();
    } catch (cause) {
      failed = scheduleChangeRecovery(cause instanceof FutrobApiError ? cause : null, action);
    }
    inFlight.current = false;
    if (!failed) {
      return onClosed(copy.actions[action].success(teamName(proposal.proposedByTeamId)), "sent");
    }
    if (failed.draft === "close") return onClosed(recoveryText(copy, failed), "refused");
    setPending(false);
    setFailure(failed);
  }

  const dateError =
    invalid === "date"
      ? copy.dateInvalid
      : failure?.field === "date"
        ? recoveryText(copy, failure)
        : null;

  return (
    <Dialog
      open
      onClose={pending ? () => undefined : onCancel}
      title={copy.actions[action].title}
      closeLabel={copy.close}
      actions={
        <>
          <Button
            label={copy.actions[action].submit}
            loading={pending}
            disabled={stale || paused}
            onPress={() => void submit()}
          />
          <Button variant="ghost" label={copy.cancel} disabled={pending} onPress={onCancel} />
        </>
      }
    >
      {action === "accept" ? (
        <Text>{copy.acceptBody(scope, at(currentStart), at(proposal.proposedStartAt))}</Text>
      ) : null}
      {action === "reject" ? (
        <>
          <Text>{copy.rejectBody(at(currentStart))}</Text>
          <ReasonField
            label={copy.rejectReason}
            value={reason}
            onChange={setReason}
            disabled={pending}
          />
        </>
      ) : null}
      {action === "counter" ? (
        <>
          <Text style={{ fontWeight: "500" }}>{copy.counterActingAs(teamName(rivalTeamId))}</Text>
          <WallTimeField
            copy={copy}
            language={language}
            value={wallTime}
            onChange={setWallTime}
            timeZone={timeZone}
            error={dateError}
            disabled={pending}
          />
          <ReasonField
            label={copy.counterReason}
            value={reason}
            onChange={setReason}
            error={invalid === "reason" ? copy.counterReasonRequired : null}
            disabled={pending}
          />
          <Note>{copy.counterBody(teamName(proposal.proposedByTeamId))}</Note>
        </>
      ) : null}
      {stale ? <Note>{copy.stale}</Note> : null}
      {paused && !stale ? <Note>{copy.paused}</Note> : null}
      {failure && failure.field === null ? <Problem>{recoveryText(copy, failure)}</Problem> : null}
    </Dialog>
  );
}
