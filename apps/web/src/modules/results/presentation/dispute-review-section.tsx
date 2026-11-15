"use client";

import { useReducer, useRef, type Dispatch, type RefObject } from "react";
import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Caption,
  SectionTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  Text,
  useExternalSync,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { DisputeCommandDialog } from "./dispute-command-dialog.tsx";
import { DISPUTE_REVIEW_ANCHOR } from "./dispute-review-anchor.ts";
import {
  buildOperatorIntent,
  EMPTY_OPERATOR_DRAFT,
  OPERATOR_COMMANDS,
  operatorCommandsFor,
  operatorDraftReducer,
  type OperatorCommand,
  type OperatorDraft,
  type OperatorDraftEvent,
  type OperatorIntent,
} from "./dispute-review-draft.ts";

import { readVersionOf, type SelectionRead } from "./selection-draft.ts";
import {
  SelectionHistory,
  SelectionOutcome,
  SelectionProposalList,
  SelectionStatusSummary,
} from "./selection-record.tsx";
import { styles } from "./selection.styles.ts";
import { useCommandAttempt } from "./use-command-attempt.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

/** `hidden` covers "not an operator" and "not known yet": nothing renders or loads. */
export type DisputeReviewState =
  | { readonly kind: "hidden" }
  | { readonly kind: "visible"; readonly read: SelectionRead<OperatorIntent> };

/**
 * The organization's view of the official selection: the current case with its
 * decisions, and the audit history. Reasons render as the server redacted them.
 */
export function DisputeReviewSection({
  candidates,
  encounter,
  state,
}: {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly encounter: EncounterViewDto;
  readonly state: DisputeReviewState;
}) {
  const { locale, t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const [draft, dispatch] = useReducer(operatorDraftReducer, EMPTY_OPERATOR_DRAFT);
  // The section mounts after its reads, too late for the router's hash scroll.
  useExternalSync(() => {
    if (state.kind === "hidden" || window.location.hash !== `#${DISPUTE_REVIEW_ANCHOR}`) return;
    heading.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  }, [state.kind]);
  if (state.kind === "hidden") return null;
  const read = draft.submission.status === "refused" ? { kind: "forbidden" as const } : state.read;
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: encounter.competition.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section aria-labelledby={DISPUTE_REVIEW_ANCHOR} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.copy)}>
          <SectionTitle id={DISPUTE_REVIEW_ANCHOR} ref={heading} tabIndex={-1}>
            {t("encounter.review.title")}
          </SectionTitle>
          <Caption>{t("encounter.review.description")}</Caption>
          <Text aria-live="polite" as="p" role="status" tone="default" weight="medium">
            {draft.accepted ? t(`encounter.review.command.${draft.accepted}.success`) : ""}
          </Text>
        </div>
        {read.kind === "ready" ? (
          <Button variant="outline" disabled={read.refreshing} onClick={read.refresh}>
            {t("encounter.review.refresh")}
          </Button>
        ) : null}
      </div>
      {read.kind === "loading" ? (
        <div aria-busy="true">
          <Caption>{t("encounter.review.loading")}</Caption>
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      ) : null}
      {read.kind === "forbidden" ? <Text>{t("encounter.review.forbidden")}</Text> : null}
      {read.kind === "error" ? (
        <RetryAlert message={t("encounter.review.error")} retry={read.retry} t={t} />
      ) : null}
      {read.kind === "ready" ? (
        <ReviewReady
          candidates={candidates}
          dispatch={dispatch}
          draft={draft}
          encounter={encounter}
          format={format}
          heading={heading}
          read={read}
        />
      ) : null}
    </section>
  );
}

function ReviewReady({
  candidates,
  dispatch,
  draft,
  encounter,
  format,
  heading,
  read,
}: {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<OperatorDraftEvent>;
  readonly draft: OperatorDraft;
  readonly encounter: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly read: Extract<SelectionRead<OperatorIntent>, { kind: "ready" }>;
}) {
  const { t } = useI18n();
  const triggers = useRef<Partial<Record<OperatorCommand, HTMLButtonElement | null>>>({});
  const send = useCommandAttempt<OperatorCommand, OperatorIntent>(dispatch);
  const { view } = read;
  const allowed = operatorCommandsFor(view);
  const readVersion = readVersionOf(view);

  function submit(command: OperatorCommand) {
    const checked = buildOperatorIntent(command, view, draft.input, draft.submission);
    if (!checked.ok) return checked.missing;
    if (allowed.includes(command)) send(draft.submission, checked.intent, readVersion, read.submit);
    return null;
  }

  return (
    <>
      {read.refreshFailed ? <Text role="status">{t("encounter.review.refreshFailed")}</Text> : null}
      <Tabs defaultValue="case" {...applyStyles(styles.tabs)}>
        <TabsList aria-label={t("encounter.review.tabs.label")}>
          <TabsTrigger value="case">{t("encounter.review.tabs.case")}</TabsTrigger>
          <TabsTrigger value="history">{t("encounter.review.tabs.history")}</TabsTrigger>
          <TabsIndicator />
        </TabsList>
        <TabsContent value="case" {...applyStyles(styles.section)}>
          <SelectionStatusSummary encounter={encounter} format={format} t={t} view={view} />
          <SelectionOutcome
            candidates={candidates}
            encounter={encounter}
            format={format}
            t={t}
            view={view}
          />
          {allowed.length > 0 ? (
            <div {...applyStyles(styles.actions)}>
              {allowed.map((command) => (
                <Button
                  key={command}
                  ref={(node) => {
                    triggers.current[command] = node;
                  }}
                  variant={command === "return_to_selection" ? "outline" : "default"}
                  onClick={() => dispatch({ type: "open", command })}
                >
                  {t(`encounter.review.command.${command}.trigger`)}
                </Button>
              ))}
            </div>
          ) : (
            <Caption>{t("encounter.review.noCommands")}</Caption>
          )}
          {view.proposals.length > 0 ? (
            <SelectionProposalList
              candidates={candidates}
              encounter={encounter}
              format={format}
              t={t}
              view={view}
            />
          ) : (
            <Caption>{t("encounter.review.empty")}</Caption>
          )}
        </TabsContent>
        <TabsContent value="history">
          {view.actions.length > 0 ? (
            <SelectionHistory
              actions={view.actions}
              encounter={encounter}
              format={format}
              proposals={view.proposals}
              t={t}
            />
          ) : (
            <Caption>{t("encounter.review.historyEmpty")}</Caption>
          )}
        </TabsContent>
      </Tabs>
      {OPERATOR_COMMANDS.map((command) => (
        <DisputeCommandDialog
          available={allowed.includes(command)}
          candidates={candidates}
          command={command}
          dispatch={dispatch}
          draft={draft}
          encounter={encounter}
          finalFocus={() => {
            // After a success the refetched view may drop the trigger right after closing.
            const trigger = triggers.current[command];
            return draft.accepted !== command && trigger?.isConnected ? trigger : heading.current;
          }}
          key={command}
          onSubmit={() => submit(command)}
          readVersion={readVersion}
          t={t}
          view={view}
        />
      ))}
    </>
  );
}
