"use client";

import { Badge } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

type RowStatus = "approved" | "selecting" | "synced" | "scheduled";

interface DemoRow {
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly status: RowStatus;
}

const ROWS: readonly DemoRow[] = [
  { home: "Real Cuervos", away: "Atlético Norte", homeGoals: 2, awayGoals: 1, status: "approved" },
  { home: "Deportivo Sur", away: "FC Titanes", homeGoals: 0, awayGoals: 0, status: "selecting" },
  { home: "Unión Barrio", away: "Rayo Capital", homeGoals: 3, awayGoals: 2, status: "synced" },
  {
    home: "Sporting Lomas",
    away: "CD Estrella",
    homeGoals: null,
    awayGoals: null,
    status: "scheduled",
  },
];

const STATUS_BADGE_VARIANT = {
  approved: "approved",
  selecting: "warning",
  synced: "info",
  scheduled: "neutral",
} as const;

export function EncounterRowsSection() {
  const { t } = useI18n();
  return (
    <section className="border-t border-border-subtle">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <div className="flex max-w-md flex-col gap-6">
          <h2 className="typo-display text-balance">{t("landing.matches.title")}</h2>
          <p className="typo-subtitle text-muted-foreground sm:text-base">
            {t("landing.matches.subtitle")}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <span className="typo-label text-muted-foreground">
              {t("landing.matches.matchday")}
            </span>
          </div>
          <ul className="border-t border-border-subtle">
            {ROWS.map((row) => (
              <li
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-b border-border-subtle px-5 py-3.5 last:border-b-0"
                key={`${row.home}-${row.away}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <ClubCrestAvatar className="size-6" imageUrl={null} name={row.home} />
                  <span className="truncate text-sm font-medium">{row.home}</span>
                </span>
                <span className="typo-score px-2 text-center">
                  {row.homeGoals === null || row.awayGoals === null
                    ? "—"
                    : `${row.homeGoals} – ${row.awayGoals}`}
                </span>
                <span className="flex min-w-0 items-center justify-end gap-2.5">
                  <span className="truncate text-sm font-medium">{row.away}</span>
                  <ClubCrestAvatar className="size-6" imageUrl={null} name={row.away} />
                </span>
                <Badge
                  className="col-start-2 row-start-2 justify-self-center"
                  variant={STATUS_BADGE_VARIANT[row.status]}
                >
                  {t(`landing.status.${row.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
