"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type {
  EncounterViewDto,
  ScheduleChangeRequestDto,
  ScheduleChangeResolutionDto,
} from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import {
  applyStyles,
  Button,
  Caption,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  SectionTitle,
  Text,
  Textarea,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { resolutionInstant, resolutionLocalTime } from "./schedule-resolution-time.ts";
import type { ResolveScheduleChange } from "./schedule-changes-section.tsx";
import { styles } from "./schedule-changes.styles.ts";

const outcomes = ["schedule_set", "schedule_kept", "walkover_intended"] as const;

export function ScheduleResolutionForm({
  request,
  resolve,
  view,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly resolve: ResolveScheduleChange;
  readonly view: EncounterViewDto;
}) {
  const { t } = useI18n();
  const id = useId();
  const current = request.proposals.find((proposal) => proposal.id === request.currentProposalId)!;
  const [outcome, setOutcome] = useState<ScheduleChangeResolutionDto["outcome"]>("schedule_set");
  const [reason, setReason] = useState("");
  const [localTime, setLocalTime] = useState(() =>
    resolutionLocalTime(current.proposedStartAt, view.competition.timeZone),
  );
  const [winningTeamId, setWinningTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [validation, setValidation] = useState<"reason" | "date" | "team" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inFlight = useRef(false);
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const teamChoices = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError(null);
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidation("reason");
      reasonInput.current?.focus();
      return;
    }
    const proposedStartAt =
      outcome === "schedule_set" ? resolutionInstant(localTime, view.competition.timeZone) : null;
    if (outcome === "schedule_set" && !proposedStartAt) {
      setValidation("date");
      dateInput.current?.focus();
      return;
    }
    if (outcome === "walkover_intended" && !winningTeamId) {
      setValidation("team");
      teamChoices.current?.querySelector<HTMLElement>('[role="radio"]')?.focus();
      return;
    }
    setValidation(null);
    const resolution: ScheduleChangeResolutionDto =
      outcome === "schedule_set"
        ? { outcome, reason: trimmed, proposedStartAt: proposedStartAt! }
        : outcome === "walkover_intended"
          ? { outcome, reason: trimmed, winningTeamId }
          : { outcome, reason: trimmed };
    const fingerprint = JSON.stringify(resolution);
    if (command.current?.fingerprint !== fingerprint)
      command.current = { fingerprint, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    try {
      await resolve(request.id, {
        proposalId: request.currentProposalId,
        expectedVersion: request.version,
        commandKey: command.current.key,
        resolution,
      });
      setSuccess(true);
    } catch (cause) {
      setError(
        cause instanceof FutrobApiError
          ? cause.status === 409
            ? t("reschedule.conflict")
            : t.error(cause.code)
          : t("errors.fallback"),
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (success) return <Text role="status">{t("reschedule.success")}</Text>;
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
      <SectionTitle as="h3" id={`${id}-title`}>
        {t("reschedule.resolve")}
      </SectionTitle>
      <div {...applyStyles(styles.meta)}>
        <Text look="label">{t("reschedule.outcome")}</Text>
        <ChoiceGroup
          aria-label={t("reschedule.outcome")}
          aria-describedby={`${id}-outcome-help`}
          value={outcome}
          onValueChange={setOutcome}
          disabled={pending}
          className={styles.choices}
        >
          {outcomes.map((value) => (
            <ChoiceGroupItem
              aria-label={t(`reschedule.outcome.${value}`)}
              appearance="pill"
              className={styles.choice}
              value={value}
              key={value}
            >
              {t(`reschedule.outcome.${value}`)}
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
        <Caption id={`${id}-outcome-help`}>
          {t(
            outcome === "schedule_set"
              ? "reschedule.setHelp"
              : outcome === "schedule_kept"
                ? "reschedule.keepHelp"
                : "reschedule.walkoverHelp",
          )}
        </Caption>
      </div>
      {outcome === "schedule_set" ? (
        <Field disabled={pending} invalid={validation === "date"}>
          <FieldLabel htmlFor={`${id}-date`}>{t("reschedule.newStart")}</FieldLabel>
          <Input
            ref={dateInput}
            id={`${id}-date`}
            type="datetime-local"
            required
            value={localTime}
            onChange={(event) => setLocalTime(event.target.value)}
            aria-describedby={`${id}-zone`}
            aria-invalid={validation === "date"}
          />
          <FieldDescription id={`${id}-zone`}>
            {t("reschedule.zone", { zone: view.competition.timeZone })}
          </FieldDescription>
          {validation === "date" ? (
            <FieldError match>{t("reschedule.dateInvalid")}</FieldError>
          ) : null}
        </Field>
      ) : null}
      {outcome === "walkover_intended" ? (
        <div ref={teamChoices} {...applyStyles(styles.meta)}>
          <Text look="label">{t("reschedule.winningTeam")}</Text>
          <ChoiceGroup
            aria-label={t("reschedule.winningTeam")}
            aria-invalid={validation === "team"}
            aria-describedby={validation === "team" ? `${id}-team-error` : undefined}
            value={winningTeamId}
            onValueChange={setWinningTeamId}
            disabled={pending}
          >
            {[view.home, view.away].map((side) => (
              <ChoiceGroupItem
                aria-label={side.name}
                appearance="pill"
                value={side.teamId}
                key={side.teamId}
              >
                {side.name}
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
          {validation === "team" ? (
            <Text role="alert" id={`${id}-team-error`}>
              {t("reschedule.winnerRequired")}
            </Text>
          ) : null}
        </div>
      ) : null}
      <Field disabled={pending} invalid={validation === "reason"}>
        <FieldLabel htmlFor={`${id}-reason`}>{t("reschedule.reason")}</FieldLabel>
        <Textarea
          ref={reasonInput}
          id={`${id}-reason`}
          required
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={validation === "reason"}
        />
        {validation === "reason" ? (
          <FieldError match>{t("reschedule.reasonRequired")}</FieldError>
        ) : null}
      </Field>
      {error ? <Text role="alert">{error}</Text> : null}
      <div {...applyStyles(styles.actions)}>
        <Button type="submit" disabled={pending}>
          {t(pending ? "reschedule.saving" : "reschedule.save")}
        </Button>
        <Caption>{t("reschedule.reasonRequired")}</Caption>
      </div>
    </form>
  );
}
