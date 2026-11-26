import { useId } from "react";
import {
  ClockIcon,
  ListBulletsIcon,
  SealCheckIcon,
  CalendarBlankIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Heading,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  vis,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { fixtureStageLabel } from "../competition-fixture-labels.ts";
import { BracketCanvas } from "./bracket-canvas.tsx";
import { BracketList } from "./bracket-list.tsx";
import {
  bracketTeamOptions,
  matchesTeam,
  type BracketStageLayout,
  type BracketTeamOption,
  type BracketView,
} from "./bracket-model.ts";
import type {
  Formatters,
  Scope,
  StageProps,
  TeamFilter,
  ViewModeControl,
} from "./bracket-page-shared.ts";
import {
  bracketChampionName,
  bracketStatusCounts,
  type BracketResults,
} from "./bracket-results.ts";
import { styles } from "./bracket-page.styles.ts";

const ALL_TEAMS = "all";

type ContentProps = TeamFilter &
  ViewModeControl & {
    readonly bracket: BracketView;
    readonly locale: string;
    readonly refreshFailed: boolean;
    readonly retry: () => void;
    readonly results: BracketResults;
    /** The Encounter list failed for a reason a retry may fix; the draw still shows. */
    readonly resultsFailed: boolean;
    readonly retryResults: () => void;
    readonly scope: Scope;
    readonly t: Translator;
  };

export function BracketContent({
  bracket,
  locale,
  onTeamChange,
  onViewChange,
  refreshFailed,
  results,
  resultsFailed,
  retry,
  retryResults,
  scope,
  t,
  teamId,
  view,
}: ContentProps) {
  const options = bracketTeamOptions(bracket, locale);
  // A Team from an old link that the draw no longer places highlights nothing; ignore it.
  const activeTeam = options.find((option) => option.teamId === teamId) ?? null;
  const formatters: Formatters = {
    kickoff: new Intl.DateTimeFormat(locale, {
      timeZone: bracket.timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    day: new Intl.DateTimeFormat(locale, {
      timeZone: bracket.timeZone,
      day: "numeric",
      month: "short",
    }),
  };
  const nodes = bracket.stages.flatMap((stage) => stage.nodes);
  const highlighted = nodes.filter((node) =>
    matchesTeam(node.encounter, activeTeam?.teamId ?? null),
  ).length;
  const stageProps = {
    formatters,
    results,
    scope,
    t,
    teamId: activeTeam?.teamId ?? null,
  };

  return (
    <div {...applyStyles(styles.stack)}>
      {refreshFailed ? (
        <RetryAlert message={t("bracket.refreshError")} retry={retry} t={t} />
      ) : null}
      {resultsFailed ? (
        <RetryAlert message={t("bracket.resultsError")} retry={retryResults} t={t} />
      ) : null}
      <Tabs
        className={styles.tabs}
        onValueChange={(value) => {
          if (value === "canvas" || value === "list") onViewChange(value);
        }}
        value={view}
        variant="pills"
      >
        <div {...applyStyles(styles.toolbar)}>
          <div {...applyStyles(styles.toolbarStart)}>
            <TabsList aria-label={t("bracket.views.label")}>
              <TabsTrigger value="canvas">
                <TreeStructureIcon aria-hidden="true" />
                {t("bracket.views.canvas")}
              </TabsTrigger>
              <TabsTrigger value="list">
                <ListBulletsIcon aria-hidden="true" />
                {t("bracket.views.list")}
              </TabsTrigger>
            </TabsList>
            {results ? <StatusSummary bracket={bracket} results={results} t={t} /> : null}
          </div>
          {options.length > 1 ? (
            <TeamSelect active={activeTeam} onTeamChange={onTeamChange} options={options} t={t} />
          ) : null}
        </div>
        <div {...applyStyles(styles.filterSummary)}>
          <Caption as="p">{t("fixture.timeZone", { zone: bracket.timeZone })}</Caption>
          {activeTeam ? (
            <>
              <Text aria-live="polite" as="p" look="caption" tone="muted">
                {t("bracket.filter.summary", { shown: highlighted, total: nodes.length })}
              </Text>
              <Button onClick={() => onTeamChange(null)} variant="ghost">
                {t("bracket.filter.clear")}
              </Button>
            </>
          ) : null}
        </div>
        <TabsContent value="canvas" {...applyStyles(styles.panel)}>
          {bracket.stages.map((stage) => (
            <BracketStage key={stage.id} mode="canvas" stage={stage} {...stageProps} />
          ))}
        </TabsContent>
        <TabsContent value="list" {...applyStyles(styles.panel)}>
          {bracket.stages.map((stage) => (
            <BracketStage key={stage.id} mode="list" stage={stage} {...stageProps} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusSummary({
  bracket,
  results,
  t,
}: {
  readonly bracket: BracketView;
  readonly results: BracketResults;
  readonly t: Translator;
}) {
  const counts = bracketStatusCounts(bracket, results);
  return (
    <ul aria-label={t("bracket.summary.label")} {...applyStyles(styles.summary)}>
      <li>
        <Badge variant="approved">
          <SealCheckIcon aria-hidden="true" />
          {t("bracket.summary.official", { count: counts.official })}
        </Badge>
      </li>
      {counts.awaiting_result > 0 ? (
        <li>
          <Badge variant="warning">
            <ClockIcon aria-hidden="true" />
            {t("bracket.summary.awaiting", { count: counts.awaiting_result })}
          </Badge>
        </li>
      ) : null}
      {counts.upcoming > 0 ? (
        <li>
          <Badge variant="neutral">
            <CalendarBlankIcon aria-hidden="true" />
            {t("bracket.summary.upcoming", { count: counts.upcoming })}
          </Badge>
        </li>
      ) : null}
    </ul>
  );
}

function TeamSelect({
  active,
  onTeamChange,
  options,
  t,
}: {
  readonly active: BracketTeamOption | null;
  readonly onTeamChange: (teamId: string | null) => void;
  readonly options: readonly BracketTeamOption[];
  readonly t: Translator;
}) {
  const id = useId();
  const allLabel = t("bracket.filter.allTeams");
  return (
    <div {...applyStyles(styles.filter)}>
      <label htmlFor={id} {...applyStyles(vis.srOnly)}>
        {t("bracket.filter.team")}
      </label>
      <Select
        items={[
          { label: allLabel, value: ALL_TEAMS },
          ...options.map((option) => ({ label: option.name, value: option.teamId })),
        ]}
        onValueChange={(value) => onTeamChange(!value || value === ALL_TEAMS ? null : value)}
        value={active?.teamId ?? ALL_TEAMS}
      >
        <SelectTrigger className={styles.filterTrigger} id={id}>
          {active?.name ?? allLabel}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TEAMS}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.teamId} value={option.teamId}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BracketStage({
  mode,
  ...props
}: Omit<StageProps, "stage"> & {
  readonly mode: "canvas" | "list";
  readonly stage: BracketStageLayout;
}) {
  const { stage, t } = props;
  const headingId = useId();
  const hintId = useId();
  const stageLabel = fixtureStageLabel(stage.kind, t);
  const rounds = stage.columns.length;
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.stage)}>
      <div {...applyStyles(styles.stageHeader)}>
        <Heading as="h2" id={headingId}>
          {stageLabel}
        </Heading>
        <ul aria-label={t("bracket.facts")} {...applyStyles(styles.facts)}>
          <li>
            <Badge>
              {rounds === 1
                ? t("bracket.rounds.one")
                : t("bracket.rounds.other", { count: rounds })}
            </Badge>
          </li>
          <li>
            <Badge>
              {stage.encounterCount === 1
                ? t("bracket.encounters.one")
                : t("bracket.encounters.other", { count: stage.encounterCount })}
            </Badge>
          </li>
          {stage.byeCount > 0 ? (
            <li>
              <Badge>
                {stage.byeCount === 1
                  ? t("bracket.byes.one")
                  : t("bracket.byes.other", { count: stage.byeCount })}
              </Badge>
            </li>
          ) : null}
          {stage.twoLegCount > 0 ? (
            <li>
              <Badge>{t("bracket.twoLegs")}</Badge>
            </li>
          ) : null}
        </ul>
      </div>
      {mode === "list" ? (
        <BracketList {...props} />
      ) : (
        <>
          <Caption as="p" id={hintId}>
            {t("bracket.hint")}
          </Caption>
          {stage.unlinkedWinnerCount > 0 ? (
            <Caption as="p">
              {stage.unlinkedWinnerCount === 1
                ? t("bracket.unlinked.one")
                : t("bracket.unlinked.other", { count: stage.unlinkedWinnerCount })}
            </Caption>
          ) : null}
          {/* Keyboard users scroll the draw by focusing it; every card inside is a link too. */}
          <div
            aria-describedby={hintId}
            aria-label={t("bracket.canvasLabel", { stage: stageLabel })}
            role="region"
            tabIndex={0}
            {...applyStyles(styles.scroller)}
          >
            <BracketCanvas championName={bracketChampionName(stage, props.results)} {...props} />
          </div>
        </>
      )}
    </section>
  );
}
