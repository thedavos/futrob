"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  competitionFormatSchema,
  type CompetitionFormatDto,
  type UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Separator,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  FlagBannerIcon,
  ListBulletsIcon,
  TrophyIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import { StepHeading } from "./competition-setup-fields.tsx";
import { FormatPlayEstimate } from "./competition-format-estimate-panel.tsx";
import { FormatStructure } from "./competition-format-structure.tsx";
import { matchesPerEncounterSummary, type Legs } from "./competition-format-copy.ts";

const FORMATS = [
  { id: "league" as const, title: "Liga", detail: "Todos contra todos", icon: ListBulletsIcon },
  { id: "knockout" as const, title: "Eliminatoria", detail: "Avanza el ganador", icon: TrophyIcon },
  {
    id: "groups-knockout" as const,
    title: "Grupos + eliminatoria",
    detail: "Dos fases",
    icon: TreeStructureIcon,
  },
  {
    id: "league-playoffs" as const,
    title: "Liga + playoffs",
    detail: "Liga y luego playoffs",
    icon: FlagBannerIcon,
  },
];

const styles = stylex.create({
  columns: {
    display: "grid",
    alignItems: "start",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.5fr) minmax(18rem, 0.85fr)",
    },
  },
  cardBody: {
    display: "grid",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  section: {
    display: "grid",
    gap: "1.5rem",
  },
  subsection: {
    display: "grid",
    gap: "1.5rem",
  },
  formats: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  formatCopy: {
    display: "grid",
    justifyItems: "center",
    gap: "0.25rem",
    minWidth: 0,
  },
  formatDetail: { color: colors.mutedForeground },
});

const FORMAT_TILE = {
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  minHeight: "8.5rem",
  gap: "0.5rem",
  padding: "1rem 0.75rem",
} as const satisfies React.CSSProperties;

export function FormatStep({
  form,
  onFormatChange,
  onRulesChange,
  disabled,
}: {
  readonly form: UpdateCompetitionDraftRequest;
  readonly onFormatChange: (format: CompetitionFormatDto) => void;
  readonly onRulesChange: (rules: UpdateCompetitionDraftRequest["rules"]) => void;
  readonly disabled: boolean;
}) {
  const [expectedTeams, setExpectedTeams] = useState("8");
  const [legs, setLegs] = useState<Legs>("double");

  function setMatches(band: "regular" | "knockout", count: 1 | 2) {
    const key = band === "regular" ? "regularStage" : "knockoutStage";
    const stage = form.rules[key];
    if (!stage) return;
    onRulesChange({
      ...form.rules,
      [key]: {
        ...stage,
        officialMatchesPerEncounter: count,
        resolutionMode: count === 1 ? "independent_matches" : stage.resolutionMode,
      },
    });
  }

  const formatLabel = FORMATS.find((item) => item.id === form.format)?.title ?? form.format;
  const legsLabel = legs === "single" ? "Una vuelta" : "Ida y vuelta";

  return (
    <div {...applyStyles(styles.columns)}>
      <Card>
        <CardContent className={styles.cardBody}>
          <section {...applyStyles(styles.section)}>
            <div {...applyStyles(styles.subsection)}>
              <StepHeading
                copy="Elige cómo competirán los equipos."
                title="Formato de competición"
              />
              <ChoiceGroup
                aria-label="Formato de competición"
                className={styles.formats}
                disabled={disabled}
                onValueChange={(value) => {
                  if (value) onFormatChange(competitionFormatSchema.parse(value));
                }}
                value={form.format}
              >
                {FORMATS.map((format) => (
                  <FormatCard disabled={disabled} format={format} key={format.id} />
                ))}
              </ChoiceGroup>
            </div>
            <Separator />
            <div {...applyStyles(styles.subsection)}>
              <StepHeading title="Estructura de la competición" />
              <FormatStructure
                disabled={disabled}
                expectedTeams={expectedTeams}
                format={form.format}
                knockout={form.rules.knockoutStage}
                legs={legs}
                onExpectedTeams={setExpectedTeams}
                onKnockoutMatches={(count) => setMatches("knockout", count)}
                onLegs={setLegs}
                onRegularMatches={(count) => setMatches("regular", count)}
                regular={form.rules.regularStage}
              />
            </div>
          </section>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={styles.cardBody}>
          <FormatPlayEstimate
            expectedTeams={expectedTeams}
            format={form.format}
            formatLabel={formatLabel}
            legs={legs}
            legsLabel={legsLabel}
            matchesLabel={matchesPerEncounterSummary(
              form.format,
              form.rules.regularStage?.officialMatchesPerEncounter ?? null,
              form.rules.knockoutStage?.officialMatchesPerEncounter ?? null,
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FormatCard({
  format,
  disabled,
}: {
  readonly format: (typeof FORMATS)[number];
  readonly disabled: boolean;
}) {
  const copy = applyStyles(styles.formatCopy);
  const detail = applyStyles(typography.caption, styles.formatDetail);
  const Icon = format.icon;
  return (
    <ChoiceGroupItem disabled={disabled} style={FORMAT_TILE} value={format.id}>
      <Icon aria-hidden size={28} />
      <span {...copy}>
        <span {...applyStyles(typography.label)}>{format.title}</span>
        <span {...detail}>{format.detail}</span>
      </span>
      <ChoiceGroupIndicator />
    </ChoiceGroupItem>
  );
}
