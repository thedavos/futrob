"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { CheckCircleIcon, CircleIcon, InfoIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { applyStyles, Button, Card, CardContent, Separator, typography, vis } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { CompetitionDraftDto, CompetitionEntryDto, TeamDto } from "@futrob/api-contracts";
import { timeZoneLabel } from "@/shared/presentation/time-zone-options.ts";
import backgroundStripesUrl from "@/assets/background-stripes.png";
import { competitionCoverSrc } from "./competition-cover-assets.ts";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionRegionLabel,
} from "./competition-draft-meta.ts";
import {
  datesLabel,
  matchesSummary,
  pointsSummary,
  reviewTiebreaks,
  rulesArePublishable,
  teamCountLabel,
} from "./competition-review-model.ts";
import { StepHeading } from "./competition-setup-fields.tsx";

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
    gap: "1.5rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  block: {
    display: "grid",
    gap: "0.75rem",
  },
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  facts: {
    display: "grid",
    gap: "0.5rem",
    margin: 0,
  },
  fact: {
    display: "grid",
    gap: "0.25rem 1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "8rem minmax(0, 1fr)",
    },
  },
  factLabel: {
    margin: 0,
    color: colors.mutedForeground,
  },
  factValue: {
    margin: 0,
    fontWeight: 600,
  },
  names: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  name: {
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.375rem 0.75rem",
    fontWeight: 600,
  },
  preview: {
    display: "grid",
    justifyItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    padding: "1.5rem 1rem",
    textAlign: "center",
    backgroundColor: colors.background,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
  },
  artwork: {
    width: "8rem",
    height: "8rem",
    objectFit: "contain",
  },
  previewName: {
    margin: 0,
    fontWeight: 600,
  },
  meta: {
    display: "grid",
    gap: "0.125rem",
    color: colors.mutedForeground,
  },
  checks: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  check: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  checkMet: { color: colors.success },
  checkOpen: { color: colors.mutedForeground },
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    margin: 0,
    color: colors.mutedForeground,
  },
});

export function ReviewStep({
  draft,
  participants,
  teams,
  onEdit,
}: {
  readonly draft: CompetitionDraftDto;
  readonly participants: readonly CompetitionEntryDto[];
  readonly teams: readonly TeamDto[];
  readonly onEdit: (step: "information" | "format" | "rules" | "participants") => void;
}) {
  const competition = draft.competition;
  const approved = participants.filter((entry) => entry.status === "approved");
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const infoReady = [
    competition.name,
    competition.gameEdition,
    competition.platform,
    competition.region,
    competition.timeZone,
  ].every((value) => value.trim().length > 0);
  const rulesReady = rulesArePublishable(competition.format, draft.rules);
  const minimumMet = approved.length >= competition.teams.min;
  const preview = applyStyles(styles.preview);

  return (
    <div {...applyStyles(styles.columns)}>
      <Card>
        <CardContent className={styles.cardBody}>
          <StepHeading
            copy="Solo aparece lo que quedó guardado."
            title="Resumen de configuración"
          />
          <SummaryBlock title="Información general" onEdit={() => onEdit("information")}>
            <Fact label="Nombre" value={competition.name} />
            <Fact label="Edición" value={competition.gameEdition} />
            <Fact label="Plataforma" value={competitionPlatformLabel(competition.platform)} />
            <Fact label="Región" value={competitionRegionLabel(competition.region)} />
            <Fact label="Zona horaria" value={timeZoneLabel(competition.timeZone)} />
            <Fact label="Fechas" value={datesLabel(competition.schedule)} />
          </SummaryBlock>
          <Separator />
          <SummaryBlock title="Formato" onEdit={() => onEdit("format")}>
            <Fact label="Tipo" value={competitionFormatLabel(competition.format)} />
            <Fact label="Enfrentamientos" value={matchesSummary(competition.format, draft.rules)} />
          </SummaryBlock>
          <Separator />
          <SummaryBlock title="Reglas" onEdit={() => onEdit("rules")}>
            <Fact label="Puntuación" value={pointsSummary(competition.format, draft.rules)} />
            <Fact label="Desempate" value={reviewTiebreaks()} />
            <Fact label="Validación" value="El rival confirma · 24 horas" />
          </SummaryBlock>
          <Separator />
          <SummaryBlock title="Participantes" onEdit={() => onEdit("participants")}>
            <Fact label="Confirmados" value={teamCountLabel(approved.length)} />
            {approved.length > 0 ? (
              <ul {...applyStyles(styles.names)}>
                {approved.map((entry) => (
                  <li key={entry.id} {...applyStyles(styles.name)}>
                    {names.get(entry.teamId) ?? "Equipo"}
                  </li>
                ))}
              </ul>
            ) : (
              <p {...applyStyles(typography.caption, styles.factLabel)}>
                Aún no hay equipos confirmados.
              </p>
            )}
          </SummaryBlock>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={styles.cardBody}>
          <div {...applyStyles(styles.block)}>
            <h2 {...applyStyles(styles.title)}>Vista previa</h2>
            <div
              {...preview}
              style={{
                ...preview.style,
                backgroundImage: `url(${backgroundStripesUrl})`,
              }}
            >
              <img
                alt=""
                data-outline="none"
                src={competitionCoverSrc(competition.cover)}
                {...applyStyles(styles.artwork)}
              />
              <p {...applyStyles(styles.previewName)}>{competition.name}</p>
              <div {...applyStyles(typography.caption, styles.meta)}>
                <span>
                  {competition.gameEdition} · {competitionPlatformLabel(competition.platform)}
                </span>
                <span>
                  {competitionFormatLabel(competition.format)} · {teamCountLabel(approved.length)}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div {...applyStyles(styles.block)}>
            <h2 {...applyStyles(styles.title)}>Lista para publicar</h2>
            <ul {...applyStyles(styles.checks)}>
              <Check done={infoReady} label="Información completa" />
              <Check done={rulesReady} label="Formato y reglas definidos" />
              <Check done={minimumMet} label="Mínimo de equipos cumplido" />
            </ul>
            <p {...applyStyles(typography.caption, styles.note)}>
              <InfoIcon
                aria-hidden
                size={20}
                style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
              />
              Las fechas se pueden definir después.
            </p>
            <p {...applyStyles(typography.caption, styles.note)}>
              <InfoIcon
                aria-hidden
                size={20}
                style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
              />
              Al publicar, la estructura de la competición queda fija.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  readonly title: string;
  readonly onEdit: () => void;
  readonly children: ReactNode;
}) {
  return (
    <section {...applyStyles(styles.block)}>
      <div {...applyStyles(styles.heading)}>
        <h3 {...applyStyles(styles.title)}>{title}</h3>
        <Button aria-label={`Editar ${title}`} onClick={onEdit} type="button" variant="ghost">
          <PencilSimpleIcon aria-hidden size={16} />
          Editar
        </Button>
      </div>
      <div {...applyStyles(styles.facts)}>{children}</div>
    </section>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div {...applyStyles(styles.fact)}>
      <span {...applyStyles(typography.caption, styles.factLabel)}>{label}</span>
      <span {...applyStyles(styles.factValue)}>{value}</span>
    </div>
  );
}

function Check({ done, label }: { readonly done: boolean; readonly label: string }) {
  const Icon = done ? CheckCircleIcon : CircleIcon;
  return (
    <li {...applyStyles(styles.check)}>
      <Icon aria-hidden size={20} {...applyStyles(done ? styles.checkMet : styles.checkOpen)} />
      <span>{label}</span>
      <span {...applyStyles(vis.srOnly)}>{done ? "Listo" : "Pendiente"}</span>
    </li>
  );
}
