"use client";

import {
  CalendarBlankIcon,
  ClockIcon,
  ClipboardTextIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  HomeKpiGroup,
  HomeKpiSkeletonGroup,
  HomeKpiStat,
} from "@/shared/presentation/stats/home-kpi.tsx";

/** A KPI value: a real count (zero included), still loading, or unavailable after a failed read. */
export type OverviewMetric = number | "loading" | "unavailable";

export function CompetitionOverviewKpis({
  applications,
  awaiting,
  teams,
  upcoming,
}: {
  readonly applications: OverviewMetric;
  readonly awaiting: OverviewMetric;
  readonly teams: OverviewMetric;
  readonly upcoming: OverviewMetric;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const metrics = [
    { id: "teams", icon: UsersThreeIcon, label: t("competition.overview.kpi.teams"), value: teams },
    {
      id: "applications",
      icon: ClipboardTextIcon,
      label: t("competition.overview.kpi.applications"),
      value: applications,
    },
    {
      id: "upcoming",
      icon: CalendarBlankIcon,
      label: t("competition.overview.kpi.upcoming"),
      value: upcoming,
    },
    {
      id: "awaiting",
      icon: ClockIcon,
      label: t("competition.overview.kpi.awaiting"),
      value: awaiting,
    },
  ] as const;

  if (metrics.every((metric) => metric.value === "loading")) {
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
            loading={metric.value === "loading"}
            value={
              metric.value === "loading" || metric.value === "unavailable"
                ? null
                : numberFormat.format(metric.value)
            }
          />
        ))}
      </HomeKpiGroup>
    </section>
  );
}
