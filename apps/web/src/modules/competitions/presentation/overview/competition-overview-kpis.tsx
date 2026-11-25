"use client";

import { CalendarBlankIcon, ClockIcon, SealCheckIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  HomeKpiGroup,
  HomeKpiSkeletonGroup,
  HomeKpiStat,
} from "@/shared/presentation/stats/home-kpi.tsx";

/** A KPI value: a real count (zero included), still loading, or unavailable after a failed read. */
export type OverviewMetric = number | "loading" | "unavailable";

/** Pending KPI: `partial` marks a lower bound when the activity page had more rows. */
export type OverviewPendingMetric =
  | { readonly count: number; readonly partial: boolean }
  | "loading"
  | "unavailable";

/** Progress ratio KPI: e.g. 15/15 officialized, or 0 when no encounters exist yet. */
export type OverviewRatioMetric =
  | { readonly done: number; readonly total: number }
  | "loading"
  | "unavailable";

function formatRatio(metric: OverviewRatioMetric, format: Intl.NumberFormat): string | null {
  if (metric === "loading" || metric === "unavailable") return null;
  if (metric.total === 0) return format.format(0);
  return `${format.format(metric.done)}/${format.format(metric.total)}`;
}

export function CompetitionOverviewKpis({
  officialized,
  pending,
  teams,
  upcoming,
}: {
  readonly officialized: OverviewRatioMetric;
  readonly pending: OverviewPendingMetric;
  readonly teams: OverviewMetric;
  readonly upcoming: OverviewMetric;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const metrics = [
    {
      id: "teams",
      icon: UsersThreeIcon,
      label: t("competition.overview.kpi.teams"),
      loading: teams === "loading",
      value: teams === "loading" || teams === "unavailable" ? null : numberFormat.format(teams),
    },
    {
      id: "officialized",
      icon: SealCheckIcon,
      label: t("competition.overview.kpi.officialized"),
      loading: officialized === "loading",
      value: formatRatio(officialized, numberFormat),
    },
    {
      id: "upcoming",
      icon: CalendarBlankIcon,
      label: t("competition.overview.kpi.upcoming"),
      loading: upcoming === "loading",
      value:
        upcoming === "loading" || upcoming === "unavailable" ? null : numberFormat.format(upcoming),
    },
    {
      id: "pending",
      icon: ClockIcon,
      label: t("competition.overview.kpi.pending"),
      loading: pending === "loading",
      value:
        pending === "loading" || pending === "unavailable"
          ? null
          : `${numberFormat.format(pending.count)}${pending.partial ? "+" : ""}`,
    },
  ] as const;

  if (metrics.every((metric) => metric.loading)) {
    return <HomeKpiSkeletonGroup columns={4} label={t("competition.overview.kpi.label")} />;
  }

  const emptyLabel = t("player.noData");

  return (
    <section aria-label={t("competition.overview.kpi.label")}>
      <HomeKpiGroup columns={4}>
        {metrics.map((metric) => (
          <HomeKpiStat
            emptyLabel={emptyLabel}
            icon={metric.icon}
            key={metric.id}
            label={metric.label}
            loading={metric.loading}
            value={metric.value}
          />
        ))}
      </HomeKpiGroup>
    </section>
  );
}
