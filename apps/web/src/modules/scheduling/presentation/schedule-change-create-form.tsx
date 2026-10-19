"use client";

import { useId, useRef, useState, type FormEvent, type Ref } from "react";
import { flushSync } from "react-dom";
import type {
  CreateScheduleChangeRequestBody,
  ScheduleChangeCreationOptionsDto,
} from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import {
  applyStyles,
  Button,
  Caption,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  FieldError,
  FieldLabel,
  SectionTitle,
  Text,
  Textarea,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  recoverFrom,
  recoveryText,
  useCommandKey,
  type CommandRecovery,
} from "./schedule-change-commands.ts";
import { ScheduleChangeDateField } from "./schedule-change-date-field.tsx";
import { competitionWallTime, resolutionInstant } from "./schedule-resolution-time.ts";
import { styles } from "./schedule-changes.styles.ts";

type Scope = ScheduleChangeCreationOptionsDto["scopes"][number]["scope"];
type ScopeOption = ScheduleChangeCreationOptionsDto["scopes"][number];

export const scopeKey = (scope: Scope) =>
  scope.type === "entire_encounter" ? "entire" : `slot-${scope.officialSlot}`;

/** Why no request can be sent at all, one message per distinct reason; empty when one can. */
export function creationBlocks(
  creation: ScheduleChangeCreationOptionsDto,
  teamName: (id: string) => string,
  t: Translator,
): readonly string[] {
  if (creation.blockedReason) return [t(`reschedule.create.blocked.${creation.blockedReason}`)];
  if (!creation.teams.some((team) => !team.blockedReason)) {
    return creation.teams.length > 0
      ? creation.teams.map((team) =>
          t("reschedule.create.blocked.limit_reached", { team: teamName(team.teamId) }),
        )
      : [t("reschedule.create.blocked.permission")];
  }
  if (!creation.scopes.some((option) => !option.blockedReason)) {
    return [
      ...new Set(creation.scopes.map((option) => option.blockedReason ?? "result_protected")),
    ].map((reason) => t(`reschedule.create.blocked.${reason}`));
  }
  return [];
}

export function ScheduleChangeCreateForm({
  creation,
  timeZone,
  format,
  teamName,
  create,
  headingRef,
  paused,
  onCancel,
  onClosed,
}: {
  readonly creation: ScheduleChangeCreationOptionsDto;
  readonly timeZone: string;
  readonly format: Intl.DateTimeFormat;
  readonly teamName: (id: string) => string;
  readonly create: (body: CreateScheduleChangeRequestBody) => Promise<void>;
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** The last reread failed: keep the draft and its key, but send only after a good read. */
  readonly paused: boolean;
  readonly onCancel: () => void;
  /** The request was sent, or refused in a way the form cannot fix; the message explains. */
  readonly onClosed: (message: string, outcome: "sent" | "refused") => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const teams = creation.teams.filter((team) => !team.blockedReason);
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [scope, setScope] = useState(() =>
    scopeKey(creation.scopes.find((option) => !option.blockedReason)!.scope),
  );
  const [localTime, setLocalTime] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [invalid, setInvalid] = useState<"date" | "reason" | null>(null);
  const [failure, setFailure] = useState<CommandRecovery | null>(null);
  const inFlight = useRef(false);
  const commandKey = useCommandKey();
  const dateInput = useRef<HTMLInputElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || paused) return;
    setFailure(null);
    const proposedWallTime = competitionWallTime(localTime);
    if (!proposedWallTime || !resolutionInstant(localTime, timeZone)) {
      setInvalid("date");
      dateInput.current?.focus();
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      setInvalid("reason");
      reasonInput.current?.focus();
      return;
    }
    setInvalid(null);
    const payload = {
      requestingTeamId: teamId,
      scope: creation.scopes.find((option) => scopeKey(option.scope) === scope)!.scope,
      proposedWallTime,
      reason: trimmed,
      timeZone,
    };
    inFlight.current = true;
    setPending(true);
    let failed: CommandRecovery | null = null;
    try {
      await create({ ...payload, idempotencyKey: commandKey(payload) });
    } catch (cause) {
      failed = recoverFrom(cause instanceof FutrobApiError ? cause : null, "create");
    }
    inFlight.current = false;
    if (!failed) return onClosed(t("reschedule.create.success"), "sent");
    if (failed.draft === "close") return onClosed(recoveryText(failed, t), "refused");
    flushSync(() => {
      setPending(false);
      setFailure(failed);
    });
    if (failed.field === "date") dateInput.current?.focus();
  }

  const scopeLabel = (option: ScopeOption) =>
    option.scope.type === "entire_encounter"
      ? t("reschedule.scope.encounter")
      : t("reschedule.scope.slot", { slot: option.scope.officialSlot });
  const dateError =
    invalid === "date"
      ? t("reschedule.dateInvalid")
      : failure?.field === "date"
        ? recoveryText(failure, t)
        : null;

  return (
    <form
      aria-labelledby={`${id}-title`}
      aria-busy={pending}
      noValidate
      onSubmit={(event) => {
        void submit(event);
      }}
      {...applyStyles(styles.form)}
    >
      <SectionTitle as="h3" id={`${id}-title`} ref={headingRef} tabIndex={-1}>
        {t("reschedule.create.title")}
      </SectionTitle>
      {creation.teams.length > 1 ? (
        <div {...applyStyles(styles.meta)}>
          <Text look="label">{t("reschedule.create.team")}</Text>
          <ChoiceGroup
            aria-label={t("reschedule.create.team")}
            value={teamId}
            onValueChange={setTeamId}
            disabled={pending}
            className={styles.choices}
          >
            {creation.teams.map((team) => (
              <ChoiceGroupItem
                appearance="pill"
                className={styles.choice}
                disabled={team.blockedReason !== null}
                value={team.teamId}
                key={team.teamId}
              >
                {teamName(team.teamId)}
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
          {creation.teams
            .filter((team) => team.blockedReason)
            .map((team) => (
              <Caption key={team.teamId}>
                {t("reschedule.create.blocked.limit_reached", { team: teamName(team.teamId) })}
              </Caption>
            ))}
        </div>
      ) : null}
      <Text tone="default" weight="medium">
        {t("reschedule.create.actingAs", { team: teamName(teamId) })}
      </Text>
      <div {...applyStyles(styles.meta)}>
        <Text look="label">{t("reschedule.create.scope")}</Text>
        <ChoiceGroup
          aria-label={t("reschedule.create.scope")}
          value={scope}
          onValueChange={setScope}
          disabled={pending}
          className={styles.choices}
        >
          {creation.scopes.map((option) => (
            <ChoiceGroupItem
              aria-label={scopeLabel(option)}
              aria-describedby={`${id}-${scopeKey(option.scope)}`}
              appearance="pill"
              className={styles.choice}
              disabled={option.blockedReason !== null}
              value={scopeKey(option.scope)}
              key={scopeKey(option.scope)}
            >
              <span {...applyStyles(styles.meta)}>
                <span>{scopeLabel(option)}</span>
                <Caption as="span" id={`${id}-${scopeKey(option.scope)}`}>
                  {option.blockedReason
                    ? t(`reschedule.create.blocked.${option.blockedReason}`)
                    : t("reschedule.create.currentStart", {
                        date: format.format(new Date(option.currentStartAt)),
                      })}
                </Caption>
              </span>
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
      </div>
      <ScheduleChangeDateField
        id={`${id}-date`}
        value={localTime}
        onChange={setLocalTime}
        timeZone={timeZone}
        format={format}
        error={dateError}
        disabled={pending}
        inputRef={dateInput}
      />
      <Field disabled={pending} invalid={invalid === "reason"}>
        <FieldLabel htmlFor={`${id}-reason`}>{t("reschedule.create.reason")}</FieldLabel>
        <Textarea
          ref={reasonInput}
          id={`${id}-reason`}
          required
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={invalid === "reason"}
        />
        {invalid === "reason" ? (
          <FieldError match>{t("reschedule.create.reasonRequired")}</FieldError>
        ) : null}
      </Field>
      <Caption>{t("reschedule.create.help")}</Caption>
      {failure && failure.field === null ? (
        <Text role="alert">{recoveryText(failure, t)}</Text>
      ) : null}
      {paused ? <Caption>{t("reschedule.paused")}</Caption> : null}
      <div {...applyStyles(styles.actions)}>
        <Button type="submit" disabled={pending || paused}>
          {t(pending ? "reschedule.create.sending" : "reschedule.create.submit")}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
