"use client";

import type {
  EncounterViewDto,
  ResolveScheduleChangeRequestBody,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SectionTitle,
  Skeleton,
  Text,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ScheduleResolutionForm } from "./schedule-resolution-form.tsx";
import { ScheduleChangeHistory } from "./schedule-change-history.tsx";
import { styles } from "./schedule-changes.styles.ts";

export type ResolveScheduleChange = (
  requestId: string,
  input: ResolveScheduleChangeRequestBody,
) => Promise<void>;

export type ScheduleChangesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly requests: readonly ScheduleChangeRequestDto[];
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
      readonly resolve: ResolveScheduleChange;
    };

export function ScheduleChangesSection({
  state,
  view,
}: {
  readonly state: ScheduleChangesState;
  readonly view: EncounterViewDto;
}) {
  const { locale, t } = useI18n();
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: view.competition.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const teamName = (id: string) =>
    id === view.home.teamId ? view.home.name : id === view.away.teamId ? view.away.name : id;
  return (
    <section aria-labelledby="encounter-rescheduling" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.copy)}>
          <SectionTitle id="encounter-rescheduling">{t("reschedule.title")}</SectionTitle>
          <Caption>{t("reschedule.description")}</Caption>
        </div>
        {state.kind === "ready" ? (
          <Button variant="outline" disabled={state.refreshing} onClick={state.refresh}>
            {t("reschedule.refresh")}
          </Button>
        ) : null}
      </div>
      {state.kind === "loading" ? (
        <div aria-busy="true">
          <Caption>{t("reschedule.loading")}</Caption>
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      ) : null}
      {state.kind === "forbidden" ? <Text>{t("reschedule.forbidden")}</Text> : null}
      {state.kind === "error" ? (
        <div role="alert" {...applyStyles(styles.actions)}>
          <Text>{t("reschedule.error")}</Text>
          <Button variant="outline" onClick={state.retry}>
            {t("common.retry")}
          </Button>
        </div>
      ) : null}
      {state.kind === "ready" && state.refreshFailed ? (
        <Text role="status">{t("reschedule.refreshFailed")}</Text>
      ) : null}
      {state.kind === "ready" && state.requests.length === 0 ? (
        <div {...applyStyles(styles.copy)}>
          <Text tone="default" weight="medium">
            {t("reschedule.empty")}
          </Text>
          <Caption>{t("reschedule.emptyHelp")}</Caption>
        </div>
      ) : null}
      {state.kind === "ready" ? (
        <ol aria-label={t("reschedule.title")} {...applyStyles(styles.list)}>
          {state.requests.map((request) => {
            const current = request.proposals.find(
              (proposal) => proposal.id === request.currentProposalId,
            )!;
            const canResolve =
              request.status === "escalated" &&
              request.allowedActions.includes("resolve") &&
              !state.refreshFailed;
            return (
              <li key={request.id} {...applyStyles(styles.request)}>
                <div {...applyStyles(styles.inline)}>
                  <Badge variant={request.status === "escalated" ? "warning" : "neutral"}>
                    {t(`reschedule.status.${request.status}`)}
                  </Badge>
                  <Text tone="default" weight="medium">
                    {request.scope.type === "entire_encounter"
                      ? t("reschedule.scope.encounter")
                      : t("reschedule.scope.slot", { slot: request.scope.officialSlot })}
                  </Text>
                  <Caption>
                    {t("reschedule.requestedBy", { team: teamName(request.requestingTeamId) })}
                  </Caption>
                </div>
                <div {...applyStyles(styles.meta)}>
                  <Text tone="default">
                    {t("reschedule.proposedStart")}:{" "}
                    <time dateTime={current.proposedStartAt}>
                      {format.format(new Date(current.proposedStartAt))}
                    </time>
                  </Text>
                  <Caption>
                    {t("reschedule.deadline", {
                      date: format.format(new Date(current.responseDeadline)),
                    })}
                  </Caption>
                  <Caption>{t("reschedule.zone", { zone: view.competition.timeZone })}</Caption>
                  <Text className={styles.reason}>{current.reason}</Text>
                </div>
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
                    resolve={state.resolve}
                    view={view}
                  />
                ) : request.status === "escalated" &&
                  !request.allowedActions.includes("resolve") ? (
                  <Caption>{t("reschedule.noPermission")}</Caption>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
