"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { EncounterViewDto, ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import {
  applyStyles,
  Button,
  Caption,
  Field,
  FieldError,
  FieldLabel,
  SectionTitle,
  Text,
  Textarea,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  recoverFrom,
  recoveryText,
  useCommandKey,
  type CommandRecovery,
} from "./schedule-change-commands.ts";
import { ScheduleChangeDateField } from "./schedule-change-date-field.tsx";
import type { ScheduleChangeCommands } from "./schedule-changes-section.tsx";
import { competitionWallTime, resolutionInstant } from "./schedule-resolution-time.ts";
import { styles } from "./schedule-changes.styles.ts";

type Action = "accept" | "reject" | "counter";
const ACTIONS = ["accept", "reject", "counter"] as const satisfies readonly Action[];

/** The proposal a draft answers, captured when it opens. */
interface Target {
  readonly proposalId: string;
  readonly version: number;
}

type ResponseDraft =
  | { readonly kind: "idle" }
  | { readonly kind: "accept"; readonly target: Target }
  | { readonly kind: "reject"; readonly target: Target; readonly reason: string }
  | {
      readonly kind: "counter";
      readonly target: Target;
      readonly localTime: string;
      readonly reason: string;
    };

const IDLE: ResponseDraft = { kind: "idle" };

export function ScheduleChangeResponses({
  request,
  view,
  format,
  teamName,
  commands,
  currentStart,
  paused,
  onOpen,
  onClosed,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly view: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  readonly teamName: (id: string) => string;
  readonly commands: Pick<ScheduleChangeCommands, Action>;
  readonly currentStart: string;
  /** The last reread failed: keep the draft and its key, but send only after a good read. */
  readonly paused: boolean;
  readonly onOpen: () => void;
  /** The draft closed after a command: announce success, or explain a refusal. */
  readonly onClosed: (message: string, outcome: "sent" | "refused") => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState<ResponseDraft>(IDLE);
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState<"date" | "reason" | null>(null);
  const [failure, setFailure] = useState<CommandRecovery | null>(null);
  const inFlight = useRef(false);
  const commandKey = useCommandKey<object>();
  const triggers = useRef<Partial<Record<Action, HTMLButtonElement | null>>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);

  const proposal = request.proposals.find((entry) => entry.id === request.currentProposalId)!;
  const rivalTeamId =
    proposal.proposedByTeamId === view.home.teamId ? view.away.teamId : view.home.teamId;
  const offered = ACTIONS.filter((action) => request.allowedActions.includes(action));
  const reasons = [...new Set(request.blockedActions.map((block) => block.reason))].filter(
    (reason) => reason !== "request_closed",
  );
  const stale =
    draft.kind !== "idle" &&
    !pending &&
    (draft.target.version !== request.version ||
      draft.target.proposalId !== request.currentProposalId ||
      !request.allowedActions.includes(draft.kind));
  const respondAs = request.respondAs;
  const responder = respondAs
    ? respondAs.authority === "organizer"
      ? t("reschedule.organizer")
      : teamName(respondAs.teamId)
    : null;
  const scope =
    request.scope.type === "entire_encounter"
      ? t("reschedule.scope.encounter")
      : t("reschedule.scope.slot", { slot: request.scope.officialSlot });
  const at = (instant: string) => format.format(new Date(instant));

  function open(action: Action) {
    const target = { proposalId: request.currentProposalId, version: request.version };
    onOpen();
    setFailure(null);
    setInvalid(null);
    flushSync(() =>
      setDraft(
        action === "accept"
          ? { kind: action, target }
          : action === "reject"
            ? { kind: action, target, reason: "" }
            : { kind: action, target, localTime: "", reason: "" },
      ),
    );
    (action === "accept"
      ? heading.current
      : action === "reject"
        ? reasonInput.current
        : dateInput.current
    )?.focus();
  }
  function cancel() {
    const action = draft.kind;
    setDraft(IDLE);
    if (action !== "idle") triggers.current[action]?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || draft.kind === "idle" || stale || paused) return;
    setFailure(null);
    const target = { requestId: request.id, proposalId: draft.target.proposalId };
    const expectedVersion = draft.target.version;
    let send: () => Promise<void>;
    if (draft.kind === "counter") {
      const proposedWallTime = competitionWallTime(draft.localTime);
      if (!proposedWallTime || !resolutionInstant(draft.localTime, view.competition.timeZone)) {
        setInvalid("date");
        dateInput.current?.focus();
        return;
      }
      const reason = draft.reason.trim();
      if (!reason) {
        setInvalid("reason");
        reasonInput.current?.focus();
        return;
      }
      const body = {
        expectedVersion,
        teamId: rivalTeamId,
        proposedWallTime,
        reason,
        timeZone: view.competition.timeZone,
      };
      const key = commandKey({ ...target, action: draft.kind, ...body });
      send = () => commands.counter(target, { ...body, commandKey: key });
    } else {
      if (!respondAs) return;
      const reason = draft.kind === "reject" ? draft.reason.trim() || undefined : undefined;
      const body = { expectedVersion, responder: respondAs };
      const key = commandKey({ ...target, action: draft.kind, ...body, reason });
      send =
        draft.kind === "accept"
          ? () => commands.accept(target, { ...body, commandKey: key })
          : () => commands.reject(target, { ...body, reason, commandKey: key });
    }
    setInvalid(null);
    const action = draft.kind;
    inFlight.current = true;
    setPending(true);
    let failed: CommandRecovery | null = null;
    try {
      await send();
    } catch (cause) {
      failed = recoverFrom(cause instanceof FutrobApiError ? cause : null, action);
    }
    inFlight.current = false;
    if (!failed || failed.draft === "close") {
      flushSync(() => {
        setPending(false);
        setDraft(IDLE);
      });
      if (failed) return onClosed(recoveryText(failed, t), "refused");
      return onClosed(
        action === "counter"
          ? t("reschedule.counter.success", { team: teamName(proposal.proposedByTeamId) })
          : t(`reschedule.${action}.success`),
        "sent",
      );
    }
    flushSync(() => {
      setPending(false);
      setFailure(failed);
    });
    if (failed.field === "date") dateInput.current?.focus();
  }

  if (request.status !== "open") return null;
  const dateError =
    invalid === "date"
      ? t("reschedule.dateInvalid")
      : failure?.field === "date"
        ? recoveryText(failure, t)
        : null;

  return (
    <div {...applyStyles(styles.meta)}>
      {reasons.map((reason) => (
        <Caption key={reason}>{t(`reschedule.blocked.${reason}`)}</Caption>
      ))}
      {offered.length > 0 ? (
        <>
          {responder && (offered.includes("accept") || offered.includes("reject")) ? (
            <Text tone="default" weight="medium">
              {t("reschedule.respondAs", { team: responder })}
            </Text>
          ) : null}
          <div {...applyStyles(styles.actions)}>
            {offered.map((action) => (
              <Button
                key={action}
                ref={(node) => {
                  triggers.current[action] = node;
                }}
                variant={action === "accept" ? "default" : "outline"}
                aria-expanded={draft.kind === action}
                aria-controls={draft.kind === action ? `${id}-panel` : undefined}
                disabled={pending}
                onClick={() => (draft.kind === action ? cancel() : open(action))}
              >
                {t(`reschedule.${action}.open`)}
              </Button>
            ))}
          </div>
        </>
      ) : null}
      {draft.kind !== "idle" ? (
        <form
          id={`${id}-panel`}
          aria-labelledby={`${id}-title`}
          aria-busy={pending}
          noValidate
          onSubmit={(event) => {
            void submit(event);
          }}
          {...applyStyles(styles.form)}
        >
          <SectionTitle as="h3" id={`${id}-title`} ref={heading} tabIndex={-1}>
            {t(`reschedule.${draft.kind}.title`)}
          </SectionTitle>
          {draft.kind === "accept" ? (
            <Text>
              {t("reschedule.accept.body", {
                scope,
                from: at(currentStart),
                to: at(proposal.proposedStartAt),
              })}
            </Text>
          ) : null}
          {draft.kind === "reject" ? (
            <>
              <Text>{t("reschedule.reject.body", { date: at(currentStart) })}</Text>
              <Field disabled={pending}>
                <FieldLabel htmlFor={`${id}-reason`}>{t("reschedule.reject.reason")}</FieldLabel>
                <Textarea
                  ref={reasonInput}
                  id={`${id}-reason`}
                  maxLength={500}
                  value={draft.reason}
                  onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                />
              </Field>
            </>
          ) : null}
          {draft.kind === "counter" ? (
            <>
              <Text tone="default" weight="medium">
                {t("reschedule.counter.actingAs", { team: teamName(rivalTeamId) })}
              </Text>
              <ScheduleChangeDateField
                id={`${id}-date`}
                value={draft.localTime}
                onChange={(localTime) => setDraft({ ...draft, localTime })}
                timeZone={view.competition.timeZone}
                format={format}
                error={dateError}
                disabled={pending}
                inputRef={dateInput}
              />
              <Field disabled={pending} invalid={invalid === "reason"}>
                <FieldLabel htmlFor={`${id}-reason`}>{t("reschedule.counter.reason")}</FieldLabel>
                <Textarea
                  ref={reasonInput}
                  id={`${id}-reason`}
                  required
                  maxLength={500}
                  value={draft.reason}
                  onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                  aria-invalid={invalid === "reason"}
                />
                {invalid === "reason" ? (
                  <FieldError match>{t("reschedule.counter.reasonRequired")}</FieldError>
                ) : null}
              </Field>
              <Caption>
                {t("reschedule.counter.body", { team: teamName(proposal.proposedByTeamId) })}
              </Caption>
            </>
          ) : null}
          {stale ? <Text role="status">{t("reschedule.stale")}</Text> : null}
          {paused && !stale ? <Caption>{t("reschedule.paused")}</Caption> : null}
          {failure && failure.field === null ? (
            <Text role="alert">{recoveryText(failure, t)}</Text>
          ) : null}
          <div {...applyStyles(styles.actions)}>
            <Button type="submit" disabled={pending || stale || paused}>
              {t(`reschedule.${draft.kind}.${pending ? "sending" : "submit"}`)}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={cancel}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
