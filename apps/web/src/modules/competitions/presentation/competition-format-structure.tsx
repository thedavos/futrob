"use client";

import * as stylex from "@stylexjs/stylex";
import type { CompetitionFormatDto, CompetitionMatchRulesDto } from "@futrob/api-contracts";
import {
  applyStyles,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { InfoIcon } from "@phosphor-icons/react";
import { SelectField } from "./competition-setup-fields.tsx";
import {
  encounterResolutionCaption,
  roundRobinNotice,
  seriesNotice,
  type Legs,
} from "./competition-format-copy.ts";

const styles = stylex.create({
  phaseTitle: { margin: 0, fontSize: "1rem", lineHeight: "1.5rem", fontWeight: 600 },
  phases: { display: "grid", gap: "1.5rem" },
  phase: { display: "grid", gap: "1rem" },
  controls: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(3, minmax(0, 1fr))",
    },
  },
  controlsWithoutLegs: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(2, minmax(0, 1fr))",
    },
  },
  legs: {
    display: "inline-flex",
    width: "100%",
    gap: 0,
    overflow: "hidden",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  segment: {
    minHeight: "var(--control-height)",
    flexGrow: 1,
    flexBasis: "0%",
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--foreground) 6%, transparent)",
      ":is([data-checked])": colors.primary,
      ":is([data-checked]):hover": colors.primary,
    },
    color: {
      default: colors.foreground,
      ":is([data-checked])": colors.primaryForeground,
    },
    boxShadow: "none",
  },
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.75rem 1rem",
  },
  caption: { color: colors.mutedForeground },
});

export function FormatStructure({
  format,
  regular,
  knockout,
  legs,
  expectedTeams,
  disabled,
  onLegs,
  onExpectedTeams,
  onRegularMatches,
  onKnockoutMatches,
}: {
  readonly format: CompetitionFormatDto;
  readonly regular: CompetitionMatchRulesDto | null;
  readonly knockout: CompetitionMatchRulesDto | null;
  readonly legs: Legs;
  readonly expectedTeams: string;
  readonly disabled: boolean;
  readonly onLegs: (legs: Legs) => void;
  readonly onExpectedTeams: (value: string) => void;
  readonly onRegularMatches: (count: 1 | 2) => void;
  readonly onKnockoutMatches: (count: 1 | 2) => void;
}) {
  if (format === "knockout" && knockout) {
    return (
      <StructureBand
        disabled={disabled}
        expectedTeams={expectedTeams}
        matches={knockout.officialMatchesPerEncounter}
        notice={seriesNotice(knockout.officialMatchesPerEncounter)}
        onExpectedTeams={onExpectedTeams}
        onMatches={onKnockoutMatches}
        showLegs={false}
      />
    );
  }

  return (
    <div {...applyStyles(styles.phases)}>
      {regular ? (
        <div {...applyStyles(styles.phase)}>
          {format !== "league" ? (
            <p {...applyStyles(styles.phaseTitle)}>
              {format === "groups-knockout" ? "Fase de grupos" : "Fase de liga"}
            </p>
          ) : null}
          <StructureBand
            disabled={disabled}
            expectedTeams={expectedTeams}
            legs={legs}
            matches={regular.officialMatchesPerEncounter}
            notice={roundRobinNotice(legs, regular.officialMatchesPerEncounter)}
            onExpectedTeams={onExpectedTeams}
            onLegs={onLegs}
            onMatches={onRegularMatches}
            showLegs
          />
        </div>
      ) : null}
      {knockout && format !== "knockout" ? (
        <div {...applyStyles(styles.phase)}>
          <p {...applyStyles(styles.phaseTitle)}>
            {format === "league-playoffs" ? "Playoffs" : "Eliminación"}
          </p>
          <StructureBand
            disabled={disabled}
            matches={knockout.officialMatchesPerEncounter}
            notice={seriesNotice(knockout.officialMatchesPerEncounter)}
            onMatches={onKnockoutMatches}
            showExpectedTeams={false}
            showLegs={false}
          />
        </div>
      ) : null}
    </div>
  );
}

function StructureBand({
  showLegs,
  showExpectedTeams = true,
  legs = "double",
  expectedTeams = "",
  matches,
  notice,
  disabled,
  onLegs,
  onExpectedTeams,
  onMatches,
}: {
  readonly showLegs: boolean;
  readonly showExpectedTeams?: boolean;
  readonly legs?: Legs;
  readonly expectedTeams?: string;
  readonly matches: 1 | 2;
  readonly notice: string;
  readonly disabled: boolean;
  readonly onLegs?: (legs: Legs) => void;
  readonly onExpectedTeams?: (value: string) => void;
  readonly onMatches: (count: 1 | 2) => void;
}) {
  const note = applyStyles(styles.note);
  return (
    <>
      <div {...applyStyles(showLegs ? styles.controls : styles.controlsWithoutLegs)}>
        {showExpectedTeams ? (
          <Field>
            <FieldLabel htmlFor="expected-teams">Equipos previstos</FieldLabel>
            <Input
              disabled={disabled}
              id="expected-teams"
              inputMode="numeric"
              min={2}
              onChange={(event) => onExpectedTeams?.(event.target.value)}
              type="number"
              value={expectedTeams}
            />
            <FieldDescription>Usado para estimar el calendario.</FieldDescription>
          </Field>
        ) : null}
        {showLegs ? (
          <Field>
            <FieldLabel>Vueltas</FieldLabel>
            <ChoiceGroup
              aria-label="Vueltas"
              className={styles.legs}
              disabled={disabled}
              onValueChange={(value) => {
                if (value === "single" || value === "double") onLegs?.(value);
              }}
              value={legs}
            >
              <ChoiceGroupItem appearance="pill" className={styles.segment} value="single">
                Una vuelta
              </ChoiceGroupItem>
              <ChoiceGroupItem appearance="pill" className={styles.segment} value="double">
                Ida y vuelta
              </ChoiceGroupItem>
            </ChoiceGroup>
          </Field>
        ) : null}
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <SelectField
            disabled={disabled}
            id={`matches-${showLegs ? "regular" : "knockout"}-${showExpectedTeams}`}
            items={[
              { value: "1", label: "1 partido" },
              { value: "2", label: "2 partidos" },
            ]}
            label="Partidos por enfrentamiento"
            onChange={(value) => onMatches(value === "2" ? 2 : 1)}
            value={String(matches)}
          />
          <p {...applyStyles(typography.caption, styles.caption)}>
            {encounterResolutionCaption(matches)}
          </p>
        </div>
      </div>
      <p {...note}>
        <InfoIcon
          aria-hidden
          size={20}
          style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
        />
        {notice}
      </p>
    </>
  );
}
