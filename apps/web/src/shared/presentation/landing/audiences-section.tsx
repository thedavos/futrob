"use client";

import type { Icon } from "@futrob/ui";
import {
  CalendarCheckIcon,
  ChartLineUpIcon,
  ListChecksIcon,
  MedalIcon,
  RankingIcon,
  TableIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface PlayerPoint {
  readonly key: "matches" | "stats" | "feats";
  readonly icon: Icon;
}

const PLAYER_POINTS: readonly PlayerPoint[] = [
  { key: "matches", icon: ListChecksIcon },
  { key: "stats", icon: ChartLineUpIcon },
  { key: "feats", icon: MedalIcon },
];

const PORTAL_POINTS = [
  { key: "teams", icon: CalendarCheckIcon },
  { key: "results", icon: TableIcon },
  { key: "rankings", icon: RankingIcon },
] as const;

export function AudiencesSection() {
  const { t } = useI18n();
  return (
    <section className="border-t border-border-subtle">
      <div className="mx-auto grid max-w-7xl gap-20 px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex max-w-md flex-col gap-6">
            <h2 className="typo-display text-balance">{t("landing.players.title")}</h2>
            <p className="typo-subtitle text-muted-foreground sm:text-base">
              {t("landing.players.subtitle")}
            </p>
          </div>
          <ul className="grid gap-6">
            {PLAYER_POINTS.map((point) => (
              <li className="flex gap-4" key={point.key}>
                <span aria-hidden="true" className="shrink-0">
                  <point.icon className="size-8 text-primary" />
                </span>
                <div>
                  <h3 className="font-semibold">{t(`landing.players.${point.key}.title`)}</h3>
                  <p className="typo-body mt-1 text-muted-foreground">
                    {t(`landing.players.${point.key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border-subtle pt-20">
          <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center">
            <h2 className="typo-display text-balance">{t("landing.portal.title")}</h2>
            <p className="typo-subtitle text-muted-foreground sm:text-base">
              {t("landing.portal.subtitle")}
            </p>
          </div>
          <ul className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            {PORTAL_POINTS.map((point) => (
              <li className="flex flex-col items-center gap-3 text-center" key={point.key}>
                <span aria-hidden="true">
                  <point.icon className="size-8 text-primary" />
                </span>
                <span className="typo-body font-medium">
                  {t(`landing.portal.point.${point.key}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
