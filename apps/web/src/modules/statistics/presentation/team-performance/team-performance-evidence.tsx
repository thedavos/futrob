import type { TeamPerformanceMetric } from "@futrob/statistics";
import { applyStyles, Caption, Score } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { TeamPerformanceRowView } from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

const METRIC_BORDER = {
  results: styles.evidenceChart1,
  goalDifference: styles.evidenceChart2,
  recentForm: styles.evidenceChart3,
  offensiveEfficiency: styles.evidenceChart4,
  defensiveEfficiency: styles.evidenceChart5,
} as const satisfies Record<TeamPerformanceMetric, (typeof styles)[keyof typeof styles]>;

const METRIC_FILL = {
  results: styles.evidenceFillChart1,
  goalDifference: styles.evidenceFillChart2,
  recentForm: styles.evidenceFillChart3,
  offensiveEfficiency: styles.evidenceFillChart4,
  defensiveEfficiency: styles.evidenceFillChart5,
} as const satisfies Record<TeamPerformanceMetric, (typeof styles)[keyof typeof styles]>;

export function teamPerformanceCoverageLabel(
  row: TeamPerformanceRowView,
  minimum: number,
  t: Translator,
): string {
  return row.reason === "insufficient_sample"
    ? t("teamPerformance.reason.insufficient_sample", { count: row.encounters, minimum })
    : t(`teamPerformance.reason.${row.reason}`);
}

function isRoundedAtOneDecimal(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) > 1e-9;
}

export function EvidencePanel({
  decimal,
  integer,
  minimum,
  row,
  signedDecimal,
  t,
}: {
  readonly decimal: Intl.NumberFormat;
  readonly integer: Intl.NumberFormat;
  readonly minimum: number;
  readonly row: TeamPerformanceRowView;
  readonly signedDecimal: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const formulaTerms = row.components
    .map(({ value, weight }) => {
      if (value === null) return "—";
      const prefix = isRoundedAtOneDecimal(value) ? "≈ " : "";
      return `${prefix}${decimal.format(value)}×${t("teamPerformance.weight", { weight })}`;
    })
    .join(" + ");

  return (
    <div {...applyStyles(styles.evidencePanel)}>
      <div {...applyStyles(styles.evidenceGrid)}>
        {row.components.map(({ contribution, metric, value, weight }) => (
          <div
            key={metric}
            {...applyStyles(styles.evidenceItem, value !== null && METRIC_BORDER[metric])}
          >
            <div {...applyStyles(styles.evidenceHead)}>
              <Caption as="span">{t(`teamPerformance.metric.${metric}`)}</Caption>
              <Caption as="span">{t("teamPerformance.weight", { weight })}</Caption>
            </div>
            <Score as="span" className={styles.evidenceContribution} size="table">
              {contribution === null
                ? t("teamPerformance.table.noValue")
                : t(
                    isRoundedAtOneDecimal(contribution)
                      ? "teamPerformance.evidence.contributionApprox"
                      : "teamPerformance.evidence.contribution",
                    {
                      points: decimal.format(contribution),
                    },
                  )}
            </Score>
            <Caption as="span" className={styles.evidenceRaw}>
              {rawEvidenceCopy(metric, row, decimal, integer, signedDecimal, t)}
            </Caption>
            <span aria-hidden="true" {...applyStyles(styles.evidenceBarTrack)}>
              {value !== null ? (
                <span
                  style={{ width: `${value}%` }}
                  {...applyStyles(styles.evidenceBarFill, METRIC_FILL[metric])}
                />
              ) : null}
            </span>
          </div>
        ))}
      </div>
      <div {...applyStyles(styles.evidenceFooter)}>
        <Caption as="p">
          {row.score !== null
            ? t("teamPerformance.evidence.formula", {
                terms: formulaTerms,
                score: integer.format(row.score),
              })
            : t("teamPerformance.evidence.failClosed", {
                reason:
                  row.reason === "missing_components"
                    ? t("teamPerformance.missing", {
                        metrics: row.missing
                          .map((metric) => t(`teamPerformance.metric.${metric}`))
                          .join(", "),
                      })
                    : teamPerformanceCoverageLabel(row, minimum, t),
              })}
        </Caption>
        <Caption as="p">
          {t("teamPerformance.evidence.sample", {
            encounters: row.coverage.encounters,
            matches: row.coverage.officialMatches,
          })}
        </Caption>
      </div>
    </div>
  );
}

function rawEvidenceCopy(
  metric: TeamPerformanceMetric,
  row: TeamPerformanceRowView,
  decimal: Intl.NumberFormat,
  integer: Intl.NumberFormat,
  signedDecimal: Intl.NumberFormat,
  t: Translator,
): string {
  const { evidence, coverage } = row;
  switch (metric) {
    case "results":
      return evidence.resultMaximum > 0
        ? t("teamPerformance.evidence.results", {
            points: decimal.format(evidence.resultPoints),
            maximum: decimal.format(evidence.resultMaximum),
          })
        : t("teamPerformance.table.noValue");
    case "goalDifference":
      return evidence.goalDifferencePerUnit !== null
        ? t("teamPerformance.evidence.goalDifference", {
            perUnit: signedDecimal.format(evidence.goalDifferencePerUnit),
          })
        : t("teamPerformance.table.noValue");
    case "recentForm":
      return evidence.recentMaximum > 0 && coverage.recentEncounters > 0
        ? t("teamPerformance.evidence.recentForm", {
            points: decimal.format(evidence.recentPoints),
            maximum: decimal.format(evidence.recentMaximum),
            encounters: coverage.recentEncounters,
          })
        : t("teamPerformance.table.noValue");
    case "offensiveEfficiency":
      return evidence.shotsFor !== null
        ? t("teamPerformance.evidence.offensive", {
            goals: integer.format(evidence.goalsFor),
            shots: integer.format(evidence.shotsFor),
          })
        : t("teamPerformance.evidence.noShots");
    case "defensiveEfficiency":
      return evidence.shotsAgainst !== null
        ? t("teamPerformance.evidence.defensive", {
            conceded: integer.format(evidence.goalsAgainst),
            shots: integer.format(evidence.shotsAgainst),
          })
        : t("teamPerformance.evidence.noShots");
    default: {
      const exhaustive: never = metric;
      return exhaustive;
    }
  }
}
