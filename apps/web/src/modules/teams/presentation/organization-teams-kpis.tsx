"use client";

import { ClockCountdownIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  HomeKpiGroup,
  HomeKpiSkeletonGroup,
  HomeKpiStat,
} from "@/shared/presentation/stats/home-kpi.tsx";

export type OrganizationTeamsMetric = number | "loading" | "unavailable";

function formatMetric(
  metric: OrganizationTeamsMetric,
  numberFormat: Intl.NumberFormat,
): string | null {
  if (metric === "loading" || metric === "unavailable") {
    return null;
  }
  return numberFormat.format(metric);
}

export function OrganizationTeamsKpis({
  total,
  active,
  pending,
}: {
  readonly total: OrganizationTeamsMetric;
  readonly active: OrganizationTeamsMetric;
  readonly pending: OrganizationTeamsMetric;
}) {
  const { locale, t } = useI18n();
  const numberFormat = new Intl.NumberFormat(locale);
  const allLoading = total === "loading" && active === "loading" && pending === "loading";

  if (allLoading) {
    return <HomeKpiSkeletonGroup columns={3} label={t("org.teams.loading")} />;
  }

  const emptyLabel = t("player.noData");

  return (
    <section aria-label={t("org.teams.summary")}>
      <HomeKpiGroup columns={3}>
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={UsersThreeIcon}
          label={t("org.teams.kpi.total")}
          loading={total === "loading"}
          value={formatMetric(total, numberFormat)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={TrophyIcon}
          label={t("org.teams.kpi.active")}
          loading={active === "loading"}
          value={formatMetric(active, numberFormat)}
        />
        <HomeKpiStat
          emptyLabel={emptyLabel}
          icon={ClockCountdownIcon}
          label={t("org.teams.kpi.pending")}
          loading={pending === "loading"}
          value={formatMetric(pending, numberFormat)}
        />
      </HomeKpiGroup>
    </section>
  );
}
