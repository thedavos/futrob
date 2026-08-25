import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

type StatBlock = PlayerGameProfileDto["summary"];
type StatisticMetric = keyof StatBlock["totals"];

const STATISTIC_METRICS = [
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const satisfies readonly StatisticMetric[];

const METRIC_KEYS = {
  goals: "player.metric.goals",
  assists: "player.metric.assists",
  shots: "player.metric.shots",
  passAttempts: "player.metric.passAttempts",
  passesMade: "player.metric.passesMade",
  tackleAttempts: "player.metric.tackleAttempts",
  tacklesMade: "player.metric.tacklesMade",
  saves: "player.metric.saves",
  yellowCards: "player.metric.yellowCards",
  redCards: "player.metric.redCards",
  mvpAwards: "player.metric.mvpAwards",
  rating: "player.metric.rating",
} as const satisfies Record<StatisticMetric, ParameterlessMessageKey>;

const styles = stylex.create({
  tabs: {
    width: "fit-content",
    maxWidth: "100%",
  },
  panel: {
    paddingTop: "1.5rem",
  },
  end: {
    textAlign: "end",
  },
  medium: {
    fontWeight: 500,
  },
  complete: {
    color: colors.mutedForeground,
  },
});

export function PlayerGameProfileBreakdown({
  profile,
  numberFormat,
  t,
}: {
  readonly profile: PlayerGameProfileDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <Tabs defaultValue="general" variant="pills">
      <TabsList {...applyStyles(styles.tabs)}>
        <TabsTrigger value="general">{t("player.statistics.tab.general")}</TabsTrigger>
        <TabsTrigger value="team">{t("player.statistics.tab.team")}</TabsTrigger>
        <TabsTrigger value="position">{t("player.statistics.tab.position")}</TabsTrigger>
      </TabsList>
      <TabsContent value="general" {...applyStyles(styles.panel)}>
        <MetricsTable
          groupLabel={null}
          numberFormat={numberFormat}
          rows={[{ label: t("player.statistics.tab.general"), stats: profile.summary }]}
          t={t}
        />
      </TabsContent>
      <TabsContent value="team" {...applyStyles(styles.panel)}>
        <MetricsTable
          groupLabel={t("player.statistics.team")}
          numberFormat={numberFormat}
          rows={profile.byTeam.map((row) => ({ label: row.clubName, stats: row }))}
          t={t}
        />
      </TabsContent>
      <TabsContent value="position" {...applyStyles(styles.panel)}>
        <MetricsTable
          groupLabel={t("player.statistics.position")}
          numberFormat={numberFormat}
          rows={profile.byPosition.map((row) => ({ label: row.position, stats: row }))}
          t={t}
        />
      </TabsContent>
    </Tabs>
  );
}

function MetricsTable({
  groupLabel,
  numberFormat,
  rows,
  t,
}: {
  readonly groupLabel: string | null;
  readonly numberFormat: Intl.NumberFormat;
  readonly rows: readonly { readonly label: string; readonly stats: StatBlock }[];
  readonly t: Translator;
}) {
  const stats = rows[0]?.stats;
  if (!stats) return null;
  const showGroup = groupLabel !== null && rows.length > 0;

  return (
    <Table aria-label={t("player.statistics.tableLabel")} dense>
      <TableHeader>
        <TableRow>
          {showGroup ? <TableHead>{groupLabel}</TableHead> : null}
          <TableHead>{t("player.statistics.metric")}</TableHead>
          <TableHead {...applyStyles(styles.end)}>{t("player.statistics.total")}</TableHead>
          <TableHead {...applyStyles(styles.end)}>{t("player.statistics.average")}</TableHead>
          <TableHead>{t("player.statistics.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.flatMap((row) =>
          STATISTIC_METRICS.map((metric) => (
            <TableRow key={`${row.label}-${metric}`}>
              {showGroup ? (
                <TableCell {...applyStyles(styles.medium)}>{row.label}</TableCell>
              ) : null}
              <TableCell {...(showGroup ? {} : applyStyles(styles.medium))}>
                {t(METRIC_KEYS[metric])}
              </TableCell>
              <TableCell {...applyStyles(typography.score, styles.end)}>
                {numberFormat.format(row.stats.totals[metric])}
              </TableCell>
              <TableCell {...applyStyles(typography.score, styles.end)}>
                {formatNullable(row.stats.averages[metric], numberFormat, t)}
              </TableCell>
              <TableCell>
                {row.stats.partial[metric] ? (
                  <Badge variant="warning">{t("player.partialData")}</Badge>
                ) : (
                  <span {...applyStyles(typography.caption, styles.complete)}>
                    {t("player.completeData")}
                  </span>
                )}
              </TableCell>
            </TableRow>
          )),
        )}
      </TableBody>
    </Table>
  );
}

function formatNullable(
  value: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string {
  return value === null ? t("player.noData") : numberFormat.format(value);
}
