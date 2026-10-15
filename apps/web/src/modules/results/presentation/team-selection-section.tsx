"use client";

import { useRef, type Dispatch, type RefObject } from "react";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Caption,
  ChoiceGroup,
  ChoiceGroupItem,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SectionTitle,
  Skeleton,
  Text,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { selectionsFor, type EncounterPreview } from "./encounter-preview.ts";
import { RetryAlert } from "./encounter-parts.tsx";
import { SelectionCommandDialog } from "./selection-command-dialog.tsx";
import {
  beginAttempt,
  buildIntent,
  currentProposalOf,
  needsReason,
  readVersionOf,
  teamCommandsFor,
  TEAM_COMMANDS,
  type Attempt,
  type CommandOutcome,
  type DraftEvent,
  type SelectionDraft,
  type TeamCommand,
} from "./selection-draft.ts";
import {
  SelectionHistory,
  SelectionProposalList,
  SelectionStatusSummary,
} from "./selection-record.tsx";
import { styles } from "./selection.styles.ts";

export type TeamSide = "home" | "away";

export type ActingTeam = {
  readonly side: TeamSide;
  /** Sides the actor's server capabilities say it speaks for. */
  readonly sides: readonly TeamSide[];
  readonly choose: (side: TeamSide) => void;
};

export type SelectionRead =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly view: OfficialSelectionViewDto;
      readonly actingTeamId: string;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
      readonly submit: (attempt: Attempt) => Promise<CommandOutcome>;
    };

/** `hidden` covers both "not a representative" and "not known yet": nothing renders. */
export type TeamSelectionState =
  | { readonly kind: "hidden" }
  | { readonly kind: "visible"; readonly acting: ActingTeam; readonly read: SelectionRead };

export function TeamSelectionSection({
  candidates,
  dispatch,
  draft,
  encounter,
  preview,
  state,
}: {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<DraftEvent>;
  readonly draft: SelectionDraft;
  readonly encounter: EncounterViewDto;
  readonly preview: EncounterPreview;
  readonly state: TeamSelectionState;
}) {
  const { locale, t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  if (state.kind === "hidden") return null;
  const { acting } = state;
  const read = draft.submission.status === "refused" ? { kind: "forbidden" as const } : state.read;
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: encounter.competition.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section aria-labelledby="encounter-selection" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.copy)}>
          <SectionTitle id="encounter-selection" ref={heading} tabIndex={-1}>
            {t("encounter.selection.title")}
          </SectionTitle>
          <Caption>{t("encounter.selection.description")}</Caption>
          <Text aria-live="polite" as="p" role="status" tone="default" weight="medium">
            {draft.accepted ? t(`encounter.selection.command.${draft.accepted}.success`) : ""}
          </Text>
        </div>
        {read.kind === "ready" ? (
          <Button variant="outline" disabled={read.refreshing} onClick={read.refresh}>
            {t("encounter.selection.refresh")}
          </Button>
        ) : null}
      </div>
      <ActingAs acting={acting} encounter={encounter} />
      {read.kind === "loading" ? (
        <div aria-busy="true">
          <Caption>{t("encounter.selection.loading")}</Caption>
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      ) : null}
      {read.kind === "forbidden" ? <Text>{t("encounter.selection.forbidden")}</Text> : null}
      {read.kind === "error" ? (
        <RetryAlert message={t("encounter.selection.error")} retry={read.retry} t={t} />
      ) : null}
      {read.kind === "ready" ? (
        <SelectionReady
          candidates={candidates}
          dispatch={dispatch}
          draft={draft}
          encounter={encounter}
          format={format}
          heading={heading}
          preview={preview}
          read={read}
        />
      ) : null}
    </section>
  );
}

function ActingAs({
  acting,
  encounter,
}: {
  readonly acting: ActingTeam;
  readonly encounter: EncounterViewDto;
}) {
  const { t } = useI18n();
  if (acting.sides.length < 2) {
    return (
      <Text look="label">
        {t("encounter.selection.actingAs")}: {encounter[acting.side].name}
      </Text>
    );
  }
  return (
    <div {...applyStyles(styles.acting)}>
      <Text look="label">{t("encounter.selection.actingAs")}</Text>
      <ChoiceGroup
        aria-label={t("encounter.selection.actingAs")}
        value={acting.side}
        onValueChange={(side: TeamSide) => acting.choose(side)}
        className={styles.sides}
      >
        {acting.sides.map((side) => (
          <ChoiceGroupItem appearance="pill" key={side} value={side}>
            {encounter[side].name}
          </ChoiceGroupItem>
        ))}
      </ChoiceGroup>
    </div>
  );
}

function SelectionReady({
  candidates,
  dispatch,
  draft,
  encounter,
  format,
  heading,
  preview,
  read,
}: {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly dispatch: Dispatch<DraftEvent>;
  readonly draft: SelectionDraft;
  readonly encounter: EncounterViewDto;
  readonly format: Intl.DateTimeFormat;
  readonly heading: RefObject<HTMLHeadingElement | null>;
  readonly preview: EncounterPreview;
  readonly read: Extract<SelectionRead, { kind: "ready" }>;
}) {
  const { t } = useI18n();
  const triggers = useRef<Partial<Record<TeamCommand, HTMLButtonElement | null>>>({});
  const inFlight = useRef(false);
  const { view } = read;
  const allowed = teamCommandsFor(view, read.actingTeamId);
  const target = currentProposalOf(view);
  const readVersion = readVersionOf(view);
  const shown = TEAM_COMMANDS.filter(
    (command) => allowed.includes(command) || draft.open === command,
  );

  function submit(command: TeamCommand) {
    const checked = buildIntent(command, {
      proposalId: target?.id ?? null,
      selections: selectionsFor(encounter, candidates, draft.assignments),
      reason: needsReason(command) ? draft.reasons[command] : "",
    });
    if (!checked.ok) return checked.missing;
    if (inFlight.current || !allowed.includes(command)) return null;
    const attempt = beginAttempt(
      draft.submission,
      checked.intent,
      readVersion,
      crypto.randomUUID(),
    );
    if (!attempt) return null;
    inFlight.current = true;
    dispatch({ type: "started", attempt });
    void read
      .submit(attempt)
      .catch((): CommandOutcome => ({ ok: false, failure: "unknown", code: null }))
      .then((outcome) => {
        inFlight.current = false;
        dispatch({ type: "settled", outcome });
      });
    return null;
  }

  return (
    <>
      {read.refreshFailed ? (
        <Text role="status">{t("encounter.selection.refreshFailed")}</Text>
      ) : null}
      <SelectionStatusSummary encounter={encounter} format={format} t={t} view={view} />
      {view.selection === null ? (
        <div {...applyStyles(styles.copy)}>
          <Text tone="default" weight="medium">
            {t("encounter.selection.empty.title")}
          </Text>
          <Caption>{t("encounter.selection.empty.description")}</Caption>
        </div>
      ) : null}
      {shown.length > 0 ? (
        <div {...applyStyles(styles.actions)}>
          {shown.map((command) => (
            <Button
              key={command}
              ref={(node) => {
                triggers.current[command] = node;
              }}
              variant={command === "confirm" || command === "propose" ? "default" : "outline"}
              onClick={() => dispatch({ type: "open", command })}
            >
              {t(`encounter.selection.command.${command}.trigger`)}
            </Button>
          ))}
        </div>
      ) : (
        <Caption>{t("encounter.selection.noCommands")}</Caption>
      )}
      {shown.map((command) => (
        <SelectionCommandDialog
          available={allowed.includes(command)}
          candidates={candidates}
          command={command}
          dispatch={dispatch}
          draft={draft}
          encounter={encounter}
          finalFocus={() => {
            const trigger = triggers.current[command];
            return trigger?.isConnected ? trigger : heading.current;
          }}
          key={command}
          onSubmit={() => submit(command)}
          preview={preview}
          readVersion={readVersion}
          t={t}
          target={target}
        />
      ))}
      {view.proposals.length > 0 ? (
        <SelectionProposalList
          candidates={candidates}
          encounter={encounter}
          format={format}
          t={t}
          view={view}
        />
      ) : null}
      {view.actions.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger>{t("encounter.selection.history.title")}</CollapsibleTrigger>
          <CollapsibleContent>
            <SelectionHistory actions={view.actions} encounter={encounter} format={format} t={t} />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </>
  );
}
