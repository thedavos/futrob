"use client";

import { Badge, cn } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface BracketTeam {
  readonly name: string;
  readonly goals: number | null;
}

const STAGES = [
  { key: "sync", dotClass: "bg-info", position: 16 },
  { key: "selection", dotClass: "bg-warning", position: 38.67 },
  { key: "approval", dotClass: "bg-approved", position: 61.33 },
  { key: "publication", dotClass: "bg-foreground", position: 84 },
] as const;

/* Desktop columns: 6% side margins, 7% gutters, 21 / 30 / 23 widths.
   SF is the widest so “Candidato EA” stays on one header line.
   Final is featured by chrome (primary edge, score), not by width.
   QF4 sits at 54% so its card clears the custody line (~90%).
   Quarterfinals are desktop-only; below `sm` the tree is SF + Final. */
const QUARTERFINALS = [
  {
    home: { name: "Real Cuervos", goals: 4 },
    away: { name: "Sporting Lomas", goals: 1 },
    className: "left-[6%] top-[4%] w-[21%]",
  },
  {
    home: { name: "Unión Barrio", goals: 2 },
    away: { name: "Deportivo Sur", goals: 0 },
    className: "left-[6%] top-[20%] w-[21%]",
  },
  {
    home: { name: "Atlético Norte", goals: 1 },
    away: { name: "FC Titanes", goals: 0 },
    className: "left-[6%] top-[38%] w-[21%]",
  },
  {
    home: { name: "Rayo Capital", goals: 3 },
    away: { name: "CD Estrella", goals: 1 },
    className: "left-[6%] top-[54%] w-[21%]",
  },
] as const;

export function HeroBracket() {
  const { t } = useI18n();
  return (
    <div
      aria-label={t("landing.hero.bracketAria")}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface"
      role="img"
    >
      <div className="relative aspect-[4/5] sm:aspect-[4/3]">
        <div className="absolute inset-4 sm:inset-6">
          <BracketLinesMobile />
          <BracketLinesDesktop />
          {QUARTERFINALS.map((match) => (
            <QuarterFinalCard
              away={match.away}
              className={match.className}
              home={match.home}
              key={`${match.home.name}-${match.away.name}`}
            />
          ))}
          <SemiFinalCard
            away={{ name: "Unión Barrio", goals: 2 }}
            className="left-[6%] top-[7%] w-[40%] sm:left-[34%] sm:top-[7.5%] sm:w-[30%]"
            home={{ name: "Real Cuervos", goals: 3 }}
          />
          <SemiFinalCard
            away={{ name: "Rayo Capital", goals: 1 }}
            badge={<Badge variant="warning">{t("landing.status.candidate")}</Badge>}
            className="left-[6%] top-[36%] w-[40%] sm:left-[34%] sm:top-[41.5%] sm:w-[30%]"
            home={{ name: "Atlético Norte", goals: 2 }}
          />
          <FinalCard className="left-[54%] top-[16%] w-[40%] sm:left-[71%] sm:top-[22%] sm:w-[23%]" />
          <ol className="absolute inset-0 m-0 list-none p-0">
            {STAGES.map((stage) => (
              <li
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                key={stage.key}
                style={{ left: `${stage.position}%`, top: "90%" }}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full ring-2 ring-surface", stage.dotClass)}
                />
                <span className="typo-caption whitespace-nowrap text-muted-foreground sm:typo-label">
                  {t(`landing.stage.${stage.key}`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function BracketLinesMobile() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full sm:hidden"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {/* Winner paths: both semifinal winners feed the final. */}
      <path
        d="M 46 17.42 H 50 V 30.9 H 54"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 46 49.2 H 50 V 30.9 H 54"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* Custody line: from the approved final down to the pipeline. */}
      <path
        d="M 74 45.8 V 90"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 16 90 H 84"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BracketLinesDesktop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden size-full sm:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {/* Quarterfinals feed the semifinals. */}
      <path
        d="M 27 8.92 H 30.5 V 16.89 H 34"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 27 24.92 H 30.5 V 16.89 H 34"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 27 42.92 H 30.5 V 50.89 H 34"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 27 58.92 H 30.5 V 50.89 H 34"
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {/* Winner paths: both semifinal winners feed the final. */}
      <path
        d="M 64 16.89 H 67.5 V 35.41 H 71"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 64 50.89 H 67.5 V 35.41 H 71"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* Custody line: from the approved final down to the pipeline. */}
      <path
        d="M 82.5 48.82 V 90"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 16 90 H 84"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function QuarterFinalCard({
  home,
  away,
  className,
}: {
  readonly home: BracketTeam;
  readonly away: BracketTeam;
  readonly className: string;
}) {
  return (
    <div
      className={cn(
        "absolute hidden rounded-md border border-border-subtle bg-surface px-1.5 py-1 sm:block",
        className,
      )}
    >
      <ul className="grid gap-0.5">
        <BracketTeamRow
          quiet
          team={home}
          winner={home.goals !== null && home.goals > (away.goals ?? 0)}
        />
        <BracketTeamRow
          quiet
          team={away}
          winner={away.goals !== null && away.goals > (home.goals ?? 0)}
        />
      </ul>
    </div>
  );
}

function SemiFinalCard({
  home,
  away,
  badge,
  className,
}: {
  readonly home: BracketTeam;
  readonly away: BracketTeam;
  readonly badge?: React.ReactNode;
  readonly className: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn("absolute rounded-lg border border-border-subtle bg-surface p-2", className)}
    >
      <div
        className={cn(
          "flex min-h-6 gap-1",
          badge
            ? "flex-col items-start sm:flex-row sm:items-center sm:justify-between sm:gap-1.5"
            : "items-center justify-between",
        )}
      >
        <span className="typo-caption min-w-0 truncate text-muted-foreground">
          {t("landing.bracket.semifinal")}
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </div>
      <ul className="mt-1.5 grid gap-1">
        <BracketTeamRow
          team={home}
          winner={home.goals !== null && home.goals > (away.goals ?? 0)}
        />
        <BracketTeamRow
          team={away}
          winner={away.goals !== null && away.goals > (home.goals ?? 0)}
        />
      </ul>
    </div>
  );
}

function FinalCard({ className }: { readonly className: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("absolute rounded-xl border border-primary/40 bg-surface p-2.5", className)}>
      <div className="flex min-h-6 items-center justify-between gap-1.5">
        <span className="typo-caption min-w-0 truncate text-muted-foreground">
          {t("landing.bracket.final")}
        </span>
        <span className="shrink-0">
          <Badge variant="approved">{t("landing.status.approved")}</Badge>
        </span>
      </div>
      <p className="mt-2 text-center text-2xl font-semibold tracking-tight tabular-nums">2 – 1</p>
      <div className="mt-1.5 grid gap-1">
        <span className="flex min-w-0 items-center justify-center gap-1.5">
          <ClubCrestAvatar className="size-3.5" imageUrl={null} name="Real Cuervos" />
          <span className="truncate text-xs font-semibold">Real Cuervos</span>
        </span>
        <span className="flex min-w-0 items-center justify-center gap-1.5">
          <ClubCrestAvatar className="size-3.5" imageUrl={null} name="Atlético Norte" />
          <span className="truncate text-xs font-semibold text-muted-foreground">
            Atlético Norte
          </span>
        </span>
      </div>
    </div>
  );
}

function BracketTeamRow({
  team,
  winner,
  quiet = false,
}: {
  readonly team: BracketTeam;
  readonly winner: boolean;
  readonly quiet?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-1.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <ClubCrestAvatar
          className={quiet ? "size-3.5" : "size-4"}
          imageUrl={null}
          name={team.name}
        />
        <span
          className={cn(
            "truncate text-xs",
            winner ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {team.name}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums text-xs",
          winner ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {team.goals ?? "–"}
      </span>
    </li>
  );
}
