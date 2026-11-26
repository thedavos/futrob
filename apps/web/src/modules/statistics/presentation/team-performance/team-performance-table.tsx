import { Fragment, useId, useState, type ComponentProps } from "react";
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  HourglassIcon,
  MinusCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { TeamPerformanceMetric } from "@futrob/statistics";
import {
  applyStyles,
  Badge,
  Caption,
  Score,
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
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { EvidencePanel, teamPerformanceCoverageLabel } from "./team-performance-evidence.tsx";
import {
  TEAM_PERFORMANCE_METRICS,
  teamPerformanceWeight,
  type TeamPerformanceCoverageReason,
  type TeamPerformanceNames,
  type TeamPerformanceRowView,
} from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

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

const COLUMN_COUNT = 10;

export function RankingTable({
  bestByMetric,
  minimum,
  names,
  rows,
  summary,
  t,
}: {
  readonly bestByMetric: Readonly<Partial<Record<TeamPerformanceMetric, number>>>;
  readonly minimum: number;
  readonly names: TeamPerformanceNames;
  readonly rows: readonly TeamPerformanceRowView[];
  readonly summary: string;
  readonly t: Translator;
}) {
  const titleId = useId();
  const basePanelId = useId();
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const { locale } = useI18n();
  const integer = new Intl.NumberFormat(locale);
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const signedDecimal = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });

  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.table.title")}</SectionTitle>
        <div {...applyStyles(styles.sectionMetaRow)}>
          <Caption as="p">{summary}</Caption>
          <span aria-hidden="true" {...applyStyles(styles.metaDot)}>
            ·
          </span>
          <Caption as="p">{t("teamPerformance.table.inspectHint")}</Caption>
        </div>
        <Caption as="p" className={styles.scrollHint}>
          {t("teamPerformance.table.scrollHint")}
        </Caption>
      </div>
      <Table containerLabelledBy={titleId} {...applyStyles(styles.table)}>
        <TableHeader>
          <TableRow>
            <TableHead className={styles.expandHead} scope="col">
              <span {...applyStyles(vis.srOnly)}>{t("teamPerformance.table.details")}</span>
            </TableHead>
            <TableHead align="end" scope="col">
              {t("teamPerformance.table.position")}
            </TableHead>
            <TableHead scope="col">{t("teamPerformance.table.team")}</TableHead>
            <TableHead align="end" scope="col">
              {t("teamPerformance.table.score")}
            </TableHead>
            {TEAM_PERFORMANCE_METRICS.map((metric) => (
              <TableHead align="end" key={metric} scope="col">
                <span {...applyStyles(styles.headStack)}>
                  <span>{t(`teamPerformance.metric.${metric}`)}</span>
                  <span {...applyStyles(styles.weight)}>
                    {t("teamPerformance.weight", { weight: teamPerformanceWeight(metric) })}
                  </span>
                </span>
              </TableHead>
            ))}
            <TableHead align="end" scope="col">
              <abbr title={t("teamPerformance.table.encounters")} {...applyStyles(styles.abbr)}>
                {t("teamPerformance.table.encountersShort")}
              </abbr>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expanded = expandedTeamId === row.teamId;
            const panelId = `${basePanelId}-${row.teamId}`;
            const teamLabel = row.name ?? t("teamPerformance.team.unknown");
            const isLeader = row.position === 1;
            return (
              <Fragment key={row.teamId}>
                <TableRow className={expanded ? styles.rowExpanded : undefined}>
                  <TableCell className={styles.expandCell}>
                    <button
                      aria-controls={panelId}
                      aria-expanded={expanded}
                      aria-label={t(
                        expanded
                          ? "teamPerformance.table.collapseRow"
                          : "teamPerformance.table.expandRow",
                        { team: teamLabel },
                      )}
                      onClick={() => setExpandedTeamId(expanded ? null : row.teamId)}
                      type="button"
                      {...applyStyles(styles.expandButton)}
                    >
                      <CaretDownIcon
                        aria-hidden="true"
                        {...applyStyles(styles.chevron, expanded && styles.chevronOpen)}
                      />
                    </button>
                  </TableCell>
                  <TableCell align="end">
                    {row.position === null ? (
                      <NoValue t={t} />
                    ) : (
                      <Score
                        align="end"
                        as="span"
                        className={[styles.positionValue, isLeader && styles.positionLeader]}
                        size="table"
                      >
                        {integer.format(row.position)}
                      </Score>
                    )}
                  </TableCell>
                  <TableCell>
                    <TeamIdentity minimum={minimum} names={names} row={row} t={t} />
                  </TableCell>
                  <TableCell align="end">
                    {row.score === null ? (
                      <Caption as="span">{t("teamPerformance.table.unranked")}</Caption>
                    ) : (
                      <span {...applyStyles(styles.scoreCell)}>
                        <span aria-hidden="true" {...applyStyles(styles.scoreTrack)}>
                          <span
                            style={{ width: `${row.score}%` }}
                            {...applyStyles(styles.scoreFill, isLeader && styles.scoreFillLeader)}
                          />
                        </span>
                        <Score align="end" as="span" className={styles.scoreValue} size="table">
                          {integer.format(row.score)}
                        </Score>
                      </span>
                    )}
                  </TableCell>
                  {row.components.map(({ metric, value }) => {
                    const isBest =
                      value !== null &&
                      bestByMetric[metric] !== undefined &&
                      value === bestByMetric[metric];
                    return (
                      <TableCell align="end" key={metric}>
                        {value === null ? (
                          <NoValue t={t} />
                        ) : (
                          <Score
                            align="end"
                            as="span"
                            className={isBest ? styles.componentBest : styles.componentValue}
                            size="table"
                          >
                            {decimal.format(value)}
                          </Score>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell align="end">
                    <Score align="end" as="span" className={styles.componentValue} size="table">
                      {integer.format(row.encounters)}
                    </Score>
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow className={styles.evidenceRow} id={panelId}>
                    <TableCell className={styles.evidenceCell} colSpan={COLUMN_COUNT}>
                      <EvidencePanel
                        decimal={decimal}
                        integer={integer}
                        minimum={minimum}
                        row={row}
                        signedDecimal={signedDecimal}
                        t={t}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
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

function TeamIdentity({
  minimum,
  names,
  row,
  t,
}: {
  readonly minimum: number;
  readonly names: TeamPerformanceNames;
  readonly row: TeamPerformanceRowView;
  readonly t: Translator;
}) {
  const crest = applyStyles(styles.crest);
  const coverage =
    row.reason !== "complete" ? <Coverage minimum={minimum} row={row} t={t} /> : null;

  if (row.name) {
    return (
      <div {...applyStyles(styles.teamWrap)}>
        <ClubCrestAvatar
          className={crest.className}
          imageUrl={null}
          name={row.name}
          style={crest.style}
        />
        <div {...applyStyles(styles.teamCopy)}>
          <span {...applyStyles(styles.teamName)}>{row.name}</span>
          {coverage}
        </div>
      </div>
    );
  }
  if (names.kind === "loading") {
    return (
      <div {...applyStyles(styles.teamWrap)}>
        <span aria-hidden="true" {...applyStyles(styles.crest, styles.crestPlaceholder)} />
        <div {...applyStyles(styles.teamCopy)}>
          <Skeleton {...applyStyles(styles.teamSkeleton)} />
          {coverage}
        </div>
      </div>
    );
  }
  return (
    <div {...applyStyles(styles.teamWrap)}>
      <span aria-hidden="true" {...applyStyles(styles.crest, styles.crestPlaceholder)} />
      <div {...applyStyles(styles.teamCopy)}>
        <span {...applyStyles(styles.teamName, styles.teamUnknown)}>
          {t("teamPerformance.team.unknown")}
        </span>
        {coverage}
      </div>
    </div>
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
  const label = teamPerformanceCoverageLabel(row, minimum, t);
  return (
    <div {...applyStyles(styles.coverageInline)}>
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
