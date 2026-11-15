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
import { currentStartOf, scheduleChangeSummary } from "./schedule-change-summary.ts";
import { styles } from "./schedule-changes.styles.ts";

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
  const at = (iso: string) => format.format(new Date(iso));
  const summaryText = summarySentence(scheduleChangeSummary(request, view), {
    scope: request.scope,
    team: proposer,
    at,
    t,
  });
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
          {summaryText}
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

function summarySentence(
  summary: ReturnType<typeof scheduleChangeSummary>,
  {
    scope,
    team,
    at,
    t,
  }: {
    readonly scope: ScheduleChangeRequestDto["scope"];
    readonly team: string;
    readonly at: (iso: string) => string;
    readonly t: ReturnType<typeof useI18n>["t"];
  },
): string {
  const slot = scope.type === "official_match" ? scope.officialSlot : null;
  switch (summary.kind) {
    case "pending":
      return slot === null
        ? t("reschedule.summary.encounter", { team, from: at(summary.from), to: at(summary.to) })
        : t("reschedule.summary.slot", { team, slot, from: at(summary.from), to: at(summary.to) });
    case "applied":
      return slot === null
        ? t("reschedule.summary.applied.encounter", { from: at(summary.from), to: at(summary.to) })
        : t("reschedule.summary.applied.slot", {
            slot,
            from: at(summary.from),
            to: at(summary.to),
          });
    case "closed":
      return slot === null
        ? t("reschedule.summary.closed.encounter", { team, to: at(summary.to) })
        : t("reschedule.summary.closed.slot", { team, slot, to: at(summary.to) });
    default: {
      const exhaustive: never = summary;
      return exhaustive;
    }
  }
}
