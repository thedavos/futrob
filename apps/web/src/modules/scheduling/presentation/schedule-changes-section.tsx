"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type {
  AcceptScheduleChangeProposalRequest,
  CounterScheduleChangeProposalRequest,
  CreateScheduleChangeRequestBody,
  EncounterViewDto,
  RejectScheduleChangeProposalRequest,
  ResolveScheduleChangeRequestBody,
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { applyStyles, Button, Caption, SectionTitle, Skeleton, Text } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { creationBlocks, ScheduleChangeCreateForm } from "./schedule-change-create-form.tsx";
import { ScheduleChangeRequestItem } from "./schedule-change-request-item.tsx";
import { styles } from "./schedule-changes.styles.ts";

export type ResolveScheduleChange = (
  requestId: string,
  input: ResolveScheduleChangeRequestBody,
) => Promise<void>;

export interface ProposalTarget {
  readonly requestId: string;
  readonly proposalId: string;
}

/** Every command rereads the Encounter, the list, competitions and the next Encounter. */
export interface ScheduleChangeCommands {
  readonly create: (body: CreateScheduleChangeRequestBody) => Promise<void>;
  readonly accept: (
    target: ProposalTarget,
    body: AcceptScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly reject: (
    target: ProposalTarget,
    body: RejectScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly counter: (
    target: ProposalTarget,
    body: CounterScheduleChangeProposalRequest,
  ) => Promise<void>;
  readonly resolve: ResolveScheduleChange;
}

export type ScheduleChangesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly requests: readonly ScheduleChangeRequestDto[];
      readonly creation: ScheduleChangeCreationOptionsDto;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
      readonly commands: ScheduleChangeCommands;
    };

export function ScheduleChangesSection({
  state,
  view,
}: {
  readonly state: ScheduleChangesState;
  readonly view: EncounterViewDto;
}) {
  const { locale, t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const createTrigger = useRef<HTMLButtonElement>(null);
  const createHeading = useRef<HTMLHeadingElement>(null);
  const sectionTitle = useRef<HTMLHeadingElement>(null);
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: view.competition.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const teamName = (id: string) =>
    id === view.home.teamId ? view.home.name : id === view.away.teamId ? view.away.name : id;
  const blocks = state.kind === "ready" ? creationBlocks(state.creation, teamName, t) : [];
  const canCreate = state.kind === "ready" && blocks.length === 0;
  const formOpen = creating && canCreate;

  function openCreate() {
    setNotice(null);
    flushSync(() => setCreating(true));
    createHeading.current?.focus();
  }
  function cancelCreate() {
    setCreating(false);
    createTrigger.current?.focus();
  }

  return (
    <section aria-labelledby="encounter-rescheduling" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.copy)}>
          <SectionTitle id="encounter-rescheduling" ref={sectionTitle} tabIndex={-1}>
            {t("reschedule.title")}
          </SectionTitle>
          <Caption>{t("reschedule.description")}</Caption>
        </div>
        {state.kind === "ready" ? (
          <div {...applyStyles(styles.actions)}>
            {canCreate ? (
              <Button
                ref={createTrigger}
                aria-expanded={formOpen}
                onClick={formOpen ? cancelCreate : openCreate}
              >
                {t("reschedule.create.open")}
              </Button>
            ) : null}
            <Button variant="outline" disabled={state.refreshing} onClick={state.refresh}>
              {t("reschedule.refresh")}
            </Button>
          </div>
        ) : null}
      </div>
      <Text role="status">{announcement}</Text>
      {state.kind === "ready" && !canCreate && !state.refreshFailed
        ? blocks.map((reason) => <Caption key={reason}>{reason}</Caption>)
        : null}
      {notice ? <Text role="alert">{notice}</Text> : null}
      {state.kind === "ready" && formOpen ? (
        <ScheduleChangeCreateForm
          creation={state.creation}
          timeZone={view.competition.timeZone}
          format={format}
          teamName={teamName}
          create={state.commands.create}
          headingRef={createHeading}
          paused={state.refreshFailed}
          onCancel={cancelCreate}
          onClosed={(message, outcome) => {
            setCreating(false);
            if (outcome === "sent") setAnnouncement(message);
            else setNotice(message);
            sectionTitle.current?.focus();
          }}
        />
      ) : null}
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
          {state.requests.map((request) => (
            <ScheduleChangeRequestItem
              key={request.id}
              request={request}
              view={view}
              format={format}
              teamName={teamName}
              commands={state.commands}
              refreshFailed={state.refreshFailed}
              announce={setAnnouncement}
            />
          ))}
        </ol>
      ) : null}
    </section>
  );
}
