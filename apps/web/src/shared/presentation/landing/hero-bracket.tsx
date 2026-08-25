"use client";

import type { ReactNode } from "react";
import { applyProps, applyStyles, Badge, Caption } from "@futrob/ui";

import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "@/shared/presentation/landing/hero-bracket.styles.ts";

interface BracketTeam {
  readonly name: string;
  readonly goals: number | null;
}

const STAGES = [
  { key: "sync", position: 16 },
  { key: "selection", position: 38.67 },
  { key: "approval", position: 61.33 },
  { key: "publication", position: 84 },
] as const;

const STAGE_DOT = {
  sync: styles.pipelineDotSync,
  selection: styles.pipelineDotSelection,
  approval: styles.pipelineDotApproval,
  publication: styles.pipelineDotPublication,
} as const;

/* Desktop columns: 6% side margins, 7% gutters, 21 / 30 / 23 widths.
   SF is the widest so “Candidato EA” stays on one header line.
   Final is featured by chrome (primary edge, score), not by width.
   QF4 sits at 54% so its card clears the custody line (~90%).
   Quarterfinals are desktop-only; below `sm` the tree is SF + Final. */
const QUARTERFINALS = [
  {
    home: { name: "Real Cuervos", goals: 4 },
    away: { name: "Sporting Lomas", goals: 1 },
    position: styles.qf1,
  },
  {
    home: { name: "Unión Barrio", goals: 2 },
    away: { name: "Deportivo Sur", goals: 0 },
    position: styles.qf2,
  },
  {
    home: { name: "Atlético Norte", goals: 1 },
    away: { name: "FC Titanes", goals: 0 },
    position: styles.qf3,
  },
  {
    home: { name: "Rayo Capital", goals: 3 },
    away: { name: "CD Estrella", goals: 1 },
    position: styles.qf4,
  },
] as const;

export function HeroBracket() {
  const { t } = useI18n();
  return (
    <div aria-label={t("landing.hero.bracketAria")} role="img" {...applyStyles(styles.frame)}>
      <div {...applyStyles(styles.canvas)}>
        <div {...applyStyles(styles.stage)}>
          <BracketLinesMobile />
          <BracketLinesDesktop />
          {QUARTERFINALS.map((match) => (
            <QuarterFinalCard
              away={match.away}
              home={match.home}
              key={`${match.home.name}-${match.away.name}`}
              position={match.position}
            />
          ))}
          <SemiFinalCard
            away={{ name: "Unión Barrio", goals: 2 }}
            home={{ name: "Real Cuervos", goals: 3 }}
            position={styles.sfTop}
          />
          <SemiFinalCard
            away={{ name: "Rayo Capital", goals: 1 }}
            badge={<Badge variant="warning">{t("landing.status.candidate")}</Badge>}
            home={{ name: "Atlético Norte", goals: 2 }}
            position={styles.sfBottom}
          />
          <FinalCard position={styles.final} />
          <ol {...applyStyles(styles.pipeline)}>
            {STAGES.map((stage) => (
              <li
                key={stage.key}
                {...applyProps(
                  undefined,
                  { left: `${stage.position}%`, top: "90%" },
                  styles.pipelineItem,
                )}
              >
                <span
                  aria-hidden="true"
                  {...applyStyles(styles.pipelineDot, STAGE_DOT[stage.key])}
                />
                <Caption as="span" {...applyStyles(styles.pipelineLabel)}>
                  {t(`landing.stage.${stage.key}`)}
                </Caption>
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
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      {...applyStyles(styles.linesMobile)}
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
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      {...applyStyles(styles.linesDesktop)}
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
  position,
}: {
  readonly home: BracketTeam;
  readonly away: BracketTeam;
  readonly position:
    | (typeof styles)["qf1"]
    | (typeof styles)["qf2"]
    | (typeof styles)["qf3"]
    | (typeof styles)["qf4"];
}) {
  return (
    <div {...applyStyles(styles.qfCard, position)}>
      <ul {...applyStyles(styles.qfList)}>
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
  position,
}: {
  readonly home: BracketTeam;
  readonly away: BracketTeam;
  readonly badge?: ReactNode;
  readonly position: (typeof styles)["sfTop"] | (typeof styles)["sfBottom"];
}) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.sfCard, position)}>
      <div {...applyStyles(badge ? styles.sfHeaderWithBadge : styles.sfHeader)}>
        <Caption as="span" {...applyStyles(styles.mutedCaption)}>
          {t("landing.bracket.semifinal")}
        </Caption>
        {badge ? <span {...applyStyles(styles.shrink)}>{badge}</span> : null}
      </div>
      <ul {...applyStyles(styles.sfList)}>
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

function FinalCard({ position }: { readonly position: (typeof styles)["final"] }) {
  const { t } = useI18n();
  const crest = applyStyles(styles.crestSm);
  return (
    <div {...applyStyles(styles.finalCard, position)}>
      <div {...applyStyles(styles.finalHeader)}>
        <Caption as="span" {...applyStyles(styles.mutedCaption)}>
          {t("landing.bracket.final")}
        </Caption>
        <span {...applyStyles(styles.shrink)}>
          <Badge variant="approved">{t("landing.status.approved")}</Badge>
        </span>
      </div>
      <p {...applyStyles(styles.finalScore)}>2 – 1</p>
      <div {...applyStyles(styles.finalTeams)}>
        <span {...applyStyles(styles.finalTeam)}>
          <ClubCrestAvatar
            className={crest.className}
            imageUrl={null}
            name="Real Cuervos"
            style={crest.style}
          />
          <span {...applyStyles(styles.finalTeamName)}>Real Cuervos</span>
        </span>
        <span {...applyStyles(styles.finalTeam)}>
          <ClubCrestAvatar
            className={crest.className}
            imageUrl={null}
            name="Atlético Norte"
            style={crest.style}
          />
          <span {...applyStyles(styles.finalTeamName, styles.finalTeamMuted)}>Atlético Norte</span>
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
  const crest = applyStyles(quiet ? styles.crestSm : styles.crestMd);
  return (
    <li {...applyStyles(styles.teamRow)}>
      <span {...applyStyles(styles.teamIdentity)}>
        <ClubCrestAvatar
          className={crest.className}
          imageUrl={null}
          name={team.name}
          style={crest.style}
        />
        <span
          {...applyStyles(styles.teamName, winner ? styles.teamNameWinner : styles.teamNameQuiet)}
        >
          {team.name}
        </span>
      </span>
      <span
        {...applyStyles(styles.teamGoals, winner ? styles.teamGoalsWinner : styles.teamGoalsQuiet)}
      >
        {team.goals ?? "–"}
      </span>
    </li>
  );
}
