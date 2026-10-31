"use client";

import { useRef, useState } from "react";
import type { EncounterViewDto, ScheduleChangeRequestDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Caption,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Text,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ScheduleChangeHistory } from "./schedule-change-history.tsx";
import { ScheduleChangeResponses } from "./schedule-change-responses.tsx";
import { ScheduleResolutionForm } from "./schedule-resolution-form.tsx";
import type { ScheduleChangeCommands } from "./schedule-changes-section.tsx";
import { styles } from "./schedule-changes.styles.ts";

/** Where the request's scope starts now, from the Encounter the hero and slots also show. */
export function currentStartOf(scope: ScheduleChangeRequestDto["scope"], view: EncounterViewDto) {
  return scope.type === "entire_encounter"
    ? view.scheduledStartAt
    : (view.officialMatches.find((match) => match.officialSlot === scope.officialSlot)
        ?.scheduledStartAt ?? view.scheduledStartAt);
}

export function ScheduleChangeRequestItem({
  request,
  view,
  format,
  teamName,
  commands,
  refreshFailed,
  announce,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly view: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  readonly teamName: (id: string) => string;
  readonly commands: ScheduleChangeCommands;
  readonly refreshFailed: boolean;
  readonly announce: (message: string) => void;
}) {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const current = request.proposals.find((proposal) => proposal.id === request.currentProposalId)!;
  const currentStart = currentStartOf(request.scope, view);
  const proposer = teamName(current.proposedByTeamId);
  const from = format.format(new Date(currentStart));
  const to = format.format(new Date(current.proposedStartAt));
  const deadline = format.format(new Date(current.responseDeadline));
  const canResolve =
    request.status === "escalated" && request.allowedActions.includes("resolve") && !refreshFailed;
  return (
    <li {...applyStyles(styles.request)}>
      <div ref={summary} tabIndex={-1} {...applyStyles(styles.meta)}>
        <Badge
          className={styles.statusBadge}
          variant={request.status === "escalated" ? "warning" : "neutral"}
        >
          {t(`reschedule.status.${request.status}`)}
        </Badge>
        <Text className={styles.summary} tone="default">
          {request.scope.type === "entire_encounter"
            ? t("reschedule.summary.encounter", { team: proposer, from, to })
            : t("reschedule.summary.slot", {
                team: proposer,
                slot: request.scope.officialSlot,
                from,
                to,
              })}
        </Text>
        {request.status === "open" ? (
          <Text>{t("reschedule.respondBy", { date: deadline })}</Text>
        ) : (
          <Caption>{t("reschedule.deadline", { date: deadline })}</Caption>
        )}
        <Text className={styles.reason}>{current.reason}</Text>
        <Caption>{t("reschedule.zone", { zone: view.competition.timeZone })}</Caption>
      </div>
      {notice ? <Text role="alert">{notice}</Text> : null}
      <ScheduleChangeResponses
        request={request}
        view={view}
        format={format}
        teamName={teamName}
        commands={commands}
        currentStart={currentStart}
        paused={refreshFailed}
        onOpen={() => setNotice(null)}
        onClosed={(message, outcome) => {
          if (outcome === "sent") {
            setNotice(null);
            announce(message);
          } else setNotice(message);
          summary.current?.focus();
        }}
      />
      <Collapsible>
        <CollapsibleTrigger>{t("reschedule.history")}</CollapsibleTrigger>
        <CollapsibleContent>
          <ScheduleChangeHistory format={format} request={request} teamName={teamName} />
        </CollapsibleContent>
      </Collapsible>
      {canResolve ? (
        <ScheduleResolutionForm
          key={`${request.id}:${request.version}`}
          request={request}
          resolve={commands.resolve}
          view={view}
        />
      ) : request.status === "escalated" && !request.allowedActions.includes("resolve") ? (
        <Caption>{t("reschedule.noPermission")}</Caption>
      ) : null}
    </li>
  );
}
