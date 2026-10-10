"use client";

import * as stylex from "@stylexjs/stylex";
import type { CompetitionFormatDto } from "@futrob/api-contracts";
import { InfoIcon } from "@phosphor-icons/react";
import { applyStyles, Separator, Stat, StatLabel, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import { StepHeading } from "./competition-setup-fields.tsx";
import { estimateFixtureCounts, parseExpectedTeams } from "./competition-format-estimate.ts";
import { estimateParticipantsNotice, type Legs } from "./competition-format-copy.ts";

const styles = stylex.create({
  stack: {
    display: "grid",
    gap: "1.25rem",
  },
  facts: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
  },
  fact: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
  },
  factLabel: {
    color: colors.mutedForeground,
  },
  factValue: {
    margin: 0,
    fontWeight: 600,
    textAlign: "end",
  },
  counts: {
    display: "grid",
    alignItems: "stretch",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
  },
  divider: {
    display: "flex",
    justifyContent: "center",
  },
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    margin: 0,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.75rem 1rem",
  },
});

export function FormatPlayEstimate({
  format,
  formatLabel,
  legs,
  legsLabel,
  expectedTeams,
  matchesLabel,
}: {
  readonly format: CompetitionFormatDto;
  readonly formatLabel: string;
  readonly legs: Legs;
  readonly legsLabel: string;
  readonly expectedTeams: string;
  readonly matchesLabel: string;
}) {
  const teams = parseExpectedTeams(expectedTeams);
  const estimate = teams === null ? null : estimateFixtureCounts(format, teams, legs);

  return (
    <div {...applyStyles(styles.stack)}>
      <StepHeading
        copy={
          teams === null
            ? "Indica los equipos previstos para estimar."
            : `Estimación con ${teams} equipos.`
        }
        title="Así se jugará"
      />
      <dl {...applyStyles(styles.facts)}>
        <Fact label="Formato" value={formatLabel} />
        <Fact label="Vueltas" value={format === "knockout" ? "—" : legsLabel} />
        <Fact label="Equipos" value={teams === null ? "—" : String(teams)} />
        <Fact label="Partidos por enfrentamiento" value={matchesLabel} />
      </dl>
      <Separator />
      <div {...applyStyles(styles.counts)}>
        <CountStat label="Jornada" value={estimate === null ? null : String(estimate.rounds)} />
        <div {...applyStyles(styles.divider)}>
          <Separator orientation="vertical" />
        </div>
        <CountStat
          label="Enfrentamientos"
          value={estimate === null ? null : String(estimate.encounters)}
        />
      </div>
      <p {...applyStyles(styles.note)}>
        <InfoIcon
          aria-hidden
          size={20}
          style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
        />
        {estimateParticipantsNotice}
      </p>
    </div>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div {...applyStyles(styles.fact)}>
      <dt {...applyStyles(typography.caption, styles.factLabel)}>{label}</dt>
      <dd {...applyStyles(styles.factValue)}>{value}</dd>
    </div>
  );
}

function CountStat({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <Stat align="center">
      <MetricStatValue emptyLabel="—" size="default" value={value} />
      <StatLabel>{label}</StatLabel>
    </Stat>
  );
}
