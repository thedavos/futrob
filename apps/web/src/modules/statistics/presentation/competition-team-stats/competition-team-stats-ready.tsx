import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Button,
  Caption,
  SectionTitle,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  hasPartialTeamStats,
  type TeamStatsSort,
  type TeamStatsView,
} from "./competition-team-stats-model.ts";
import type { CompetitionTeamStatsState, TeamNamesState } from "./competition-team-stats-state.ts";
import { CompetitionTeamStatsSummary } from "./competition-team-stats-summary.tsx";
import {
  CompetitionTeamStatsTable,
  TeamStatsViewSelector,
  type TeamStatsFormats,
} from "./competition-team-stats-table.tsx";

const styles = stylex.create({
  ready: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    minWidth: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  sectionHead: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: { default: "flex-start", [media.md]: "flex-end" },
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  sectionCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    minWidth: 0,
  },
  alertRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
});

export type TableControls = {
  readonly view: TeamStatsView;
  readonly sort: TeamStatsSort;
  readonly onViewChange: (view: TeamStatsView) => void;
  readonly onSortChange: (sort: TeamStatsSort) => void;
};

export function StatsReady({
  compareText,
  controls,
  dateFormat,
  formats,
  names,
  state,
  t,
}: {
  readonly compareText: (a: string, b: string) => number;
  readonly controls: TableControls;
  readonly dateFormat: Intl.DateTimeFormat;
  readonly formats: TeamStatsFormats;
  readonly names: TeamNamesState;
  readonly state: Extract<CompetitionTeamStatsState, { kind: "ready" }>;
  readonly t: Translator;
}) {
  const titleId = useId();
  return (
    <div {...applyStyles(styles.ready)}>
      {state.refreshFailed ? (
        <RetryAlert
          message={t("competition.teamStats.refreshFailed")}
          retry={state.refreshFailed.retry}
          t={t}
          variant="warning"
        />
      ) : null}
      <CompetitionTeamStatsSummary
        dateFormat={dateFormat}
        formats={formats}
        names={names}
        t={t}
        teams={state.teams}
      />
      {hasPartialTeamStats(state.teams) ? (
        <Alert variant="warning">
          <AlertTitle>{t("competition.teamStats.partial.title")}</AlertTitle>
          <AlertDescription>{t("competition.teamStats.partial.description")}</AlertDescription>
        </Alert>
      ) : null}
      {names.kind === "error" ? (
        <RetryAlert
          message={t(
            names.reason === "denied"
              ? "competition.teamStats.teamName.denied"
              : "competition.teamStats.teamName.error",
          )}
          retry={names.retry}
          t={t}
        />
      ) : null}
      {names.kind === "ready" && names.refreshFailed ? (
        <RetryAlert
          message={t("competition.teamStats.teamName.refreshFailed")}
          retry={names.refreshFailed.retry}
          t={t}
          variant="warning"
        />
      ) : null}
      <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
        <div {...applyStyles(styles.sectionHead)}>
          <div {...applyStyles(styles.sectionCopy)}>
            <SectionTitle id={titleId}>{t("competition.teamStats.comparison.title")}</SectionTitle>
            <Caption as="p">{t("competition.teamStats.comparison.description")}</Caption>
          </div>
          <TeamStatsViewSelector onViewChange={controls.onViewChange} t={t} view={controls.view} />
        </div>
        <CompetitionTeamStatsTable
          compareText={compareText}
          formats={formats}
          labelledBy={titleId}
          names={names}
          onSortChange={controls.onSortChange}
          sort={controls.sort}
          t={t}
          teams={state.teams}
          view={controls.view}
        />
      </section>
    </div>
  );
}

export function RetryAlert({
  message,
  retry,
  t,
  variant = "destructive",
}: {
  readonly message: string;
  readonly retry: () => void;
  readonly t: Translator;
  readonly variant?: "destructive" | "warning";
}) {
  return (
    <Alert variant={variant}>
      <AlertDescription {...applyStyles(styles.alertRow)}>
        <span>{message}</span>
        <Button onClick={retry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
