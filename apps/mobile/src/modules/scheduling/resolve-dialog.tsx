import { useRef, useState } from "react";
import type { ScheduleChangeRequestDto, ScheduleChangeResolutionDto } from "@futrob/api-contracts";
import {
  competitionWallTimeFields,
  currentScheduleChangeProposal,
  FutrobApiError,
  scheduleChangeResolutionFailure,
} from "@futrob/sdk";
import { Button, Dialog } from "@/ui";
import { Note, Problem, type Shared } from "./reschedule-dialogs";
import {
  ChoiceGroup,
  ReasonField,
  useCommandKey,
  WallTimeField,
  wallTimeInstant,
} from "./reschedule-fields";
import type { ScheduleChangeCommands } from "./use-schedule-changes";

const OUTCOMES = ["schedule_set", "schedule_kept", "walkover_intended"] as const;
type Outcome = ScheduleChangeResolutionDto["outcome"];

export function ResolveDialog({
  request,
  resolve,
  ...shared
}: Shared & {
  readonly request: ScheduleChangeRequestDto;
  readonly resolve: ScheduleChangeCommands["resolve"];
}) {
  const { copy, language, view, paused, onCancel, onClosed } = shared;
  const timeZone = view.competition.timeZone;
  const proposal = currentScheduleChangeProposal(request);
  const [outcome, setOutcome] = useState<Outcome>("schedule_set");
  const [reason, setReason] = useState("");
  const [wallTime, setWallTime] = useState(() =>
    competitionWallTimeFields(proposal.proposedStartAt, timeZone),
  );
  const [winningTeamId, setWinningTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState<"reason" | "date" | "team" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const commandKey = useCommandKey();

  async function submit() {
    if (inFlight.current || paused) return;
    setError(null);
    const trimmed = reason.trim();
    if (!trimmed) return setInvalid("reason");
    const proposedStartAt = outcome === "schedule_set" ? wallTimeInstant(wallTime, timeZone) : null;
    if (outcome === "schedule_set" && !proposedStartAt) return setInvalid("date");
    if (outcome === "walkover_intended" && !winningTeamId) return setInvalid("team");
    setInvalid(null);
    const resolution: ScheduleChangeResolutionDto =
      outcome === "schedule_set"
        ? { outcome, reason: trimmed, proposedStartAt: proposedStartAt! }
        : outcome === "walkover_intended"
          ? { outcome, reason: trimmed, winningTeamId }
          : { outcome, reason: trimmed };
    inFlight.current = true;
    setPending(true);
    try {
      await resolve(request.id, {
        proposalId: request.currentProposalId,
        expectedVersion: request.version,
        commandKey: commandKey(resolution),
        resolution,
      });
      inFlight.current = false;
      onClosed(copy.success, "sent");
    } catch (cause) {
      inFlight.current = false;
      setPending(false);
      setError(
        copy.recovery[
          scheduleChangeResolutionFailure(cause instanceof FutrobApiError ? cause : null).message
        ],
      );
    }
  }

  return (
    <Dialog
      open
      onClose={pending ? () => undefined : onCancel}
      title={copy.resolve}
      closeLabel={copy.close}
      actions={
        <>
          <Button
            label={copy.save}
            loading={pending}
            disabled={paused}
            onPress={() => void submit()}
          />
          <Button variant="ghost" label={copy.cancel} disabled={pending} onPress={onCancel} />
        </>
      }
    >
      <ChoiceGroup
        label={copy.outcome}
        value={outcome}
        onChange={setOutcome}
        disabled={pending}
        choices={OUTCOMES.map((value) => ({
          value,
          label: copy.outcomes[value],
          description: copy.outcomeHelp[value],
        }))}
      />
      {outcome === "schedule_set" ? (
        <WallTimeField
          copy={copy}
          language={language}
          value={wallTime}
          onChange={setWallTime}
          timeZone={timeZone}
          error={invalid === "date" ? copy.dateInvalid : null}
          disabled={pending}
        />
      ) : null}
      {outcome === "walkover_intended" ? (
        <ChoiceGroup
          label={copy.winningTeam}
          value={winningTeamId}
          onChange={setWinningTeamId}
          disabled={pending}
          error={invalid === "team" ? copy.winnerRequired : null}
          choices={[view.home, view.away].map((side) => ({
            value: side.teamId,
            label: side.name,
          }))}
        />
      ) : null}
      <ReasonField
        label={copy.reason}
        value={reason}
        onChange={setReason}
        error={invalid === "reason" ? copy.reasonRequired : null}
        disabled={pending}
      />
      {paused ? <Note>{copy.paused}</Note> : null}
      {error ? <Problem>{error}</Problem> : null}
    </Dialog>
  );
}
