import { useId, type ComponentProps } from "react";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  HourglassIcon,
  MinusCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import {
  applyStyles,
  Badge,
  Caption,
  SectionTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  vis,
  type Icon,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  TEAM_PERFORMANCE_METRICS,
  teamPerformanceWeight,
  type TeamPerformanceCoverageReason,
  type TeamPerformanceNames,
  type TeamPerformanceRowView,
} from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

/** `TableHead` owns `text-align: left`; inline wins without racing its atomic class. */
const END = { textAlign: "end" } as const;

const REASON = {
  complete: { variant: "neutral", icon: CheckCircleIcon },
  no_data: { variant: "neutral", icon: MinusCircleIcon },
  insufficient_sample: { variant: "warning", icon: HourglassIcon },
  missing_components: { variant: "warning", icon: WarningIcon },
  projection_incomplete: { variant: "info", icon: ArrowsClockwiseIcon },
} as const satisfies Record<
  TeamPerformanceCoverageReason,
  { readonly variant: ComponentProps<typeof Badge>["variant"]; readonly icon: Icon }
>;

export function RankingTable({
  minimum,
  names,
  rows,
  summary,
  t,
}: {
  readonly minimum: number;
  readonly names: TeamPerformanceNames;
  readonly rows: readonly TeamPerformanceRowView[];
  readonly summary: string;
  readonly t: Translator;
}) {
  const titleId = useId();
  const { locale } = useI18n();
  const component = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const numeric = applyStyles(styles.numeric);
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.table.title")}</SectionTitle>
        <Caption as="p">{summary}</Caption>
        <Caption as="p" className={styles.scrollHint}>
          {t("teamPerformance.table.scrollHint")}
        </Caption>
      </div>
      <Table containerLabelledBy={titleId} {...applyStyles(styles.table)}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.position")}
            </TableHead>
            <TableHead scope="col">{t("teamPerformance.table.team")}</TableHead>
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.score")}
            </TableHead>
            {TEAM_PERFORMANCE_METRICS.map((metric) => (
              <TableHead key={metric} scope="col" style={END}>
                <span {...applyStyles(styles.headStack)}>
                  <span>{t(`teamPerformance.metric.${metric}`)}</span>
                  <span {...applyStyles(styles.weight)}>
                    {t("teamPerformance.weight", { weight: teamPerformanceWeight(metric) })}
                  </span>
                </span>
              </TableHead>
            ))}
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.encounters")}
            </TableHead>
            <TableHead scope="col">{t("teamPerformance.table.coverage")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.teamId}>
              <TableCell {...numeric}>
                {row.position === null ? <NoValue t={t} /> : row.position}
              </TableCell>
              <TableCell>
                <TeamName names={names} row={row} t={t} />
              </TableCell>
              <TableCell {...numeric}>
                {row.score === null ? (
                  <Caption as="span">{t("teamPerformance.table.unranked")}</Caption>
                ) : (
                  <span {...applyStyles(styles.scoreValue)}>{row.score}</span>
                )}
              </TableCell>
              {row.components.map(({ metric, value }) => (
                <TableCell key={metric} {...numeric}>
                  {value === null ? <NoValue t={t} /> : component.format(value)}
                </TableCell>
              ))}
              <TableCell {...numeric}>{row.encounters}</TableCell>
              <TableCell>
                <Coverage minimum={minimum} row={row} t={t} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function NoValue({ t }: { readonly t: Translator }) {
  return (
    <>
      <span aria-hidden="true" {...applyStyles(styles.muted)}>
        —
      </span>
      <span {...applyStyles(vis.srOnly)}>{t("teamPerformance.table.noValue")}</span>
    </>
  );
}

function TeamName({
  names,
  row,
  t,
}: {
  readonly names: TeamPerformanceNames;
  readonly row: TeamPerformanceRowView;
  readonly t: Translator;
}) {
  if (row.name) return <span {...applyStyles(styles.team)}>{row.name}</span>;
  if (names.kind === "loading") return <Skeleton {...applyStyles(styles.teamSkeleton)} />;
  return (
    <span {...applyStyles(styles.team, styles.teamUnknown)}>
      {t("teamPerformance.team.unknown")}
    </span>
  );
}

function Coverage({
  minimum,
  row,
  t,
}: {
  readonly minimum: number;
  readonly row: TeamPerformanceRowView;
  readonly t: Translator;
}) {
  const { variant, icon: ReasonIcon } = REASON[row.reason];
  const label =
    row.reason === "insufficient_sample"
      ? t("teamPerformance.reason.insufficient_sample", { count: row.encounters, minimum })
      : t(`teamPerformance.reason.${row.reason}`);
  return (
    <div {...applyStyles(styles.coverage)}>
      <Badge className={styles.badge} variant={variant}>
        <ReasonIcon aria-hidden="true" />
        {label}
      </Badge>
      {row.reason === "missing_components" ? (
        <Caption as="span">
          {t("teamPerformance.missing", {
            metrics: row.missing.map((metric) => t(`teamPerformance.metric.${metric}`)).join(", "),
          })}
        </Caption>
      ) : null}
    </div>
  );
}
