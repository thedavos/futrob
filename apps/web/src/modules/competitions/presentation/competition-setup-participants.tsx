"use client";

import { useId, useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Field,
  FieldLabel,
  Input,
  Separator,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type {
  CompetitionEntryDto,
  CompetitionEntryStatusDto,
  TeamDto,
} from "@futrob/api-contracts";
import squadUrl from "@/assets/illustration-squad.png";
import { SelectField, StepHeading } from "./competition-setup-fields.tsx";

const STATUS_FILTERS = [
  { value: "all", label: "Todos los estados" },
  { value: "approved", label: "Aprobados" },
  { value: "pending", label: "Pendientes" },
  { value: "rejected", label: "Rechazados" },
] as const;

const ENTRY_STATUS_BADGES = {
  approved: { label: "Aprobado", variant: "neutral" },
  pending: { label: "Pendiente", variant: "warning" },
  rejected: { label: "Rechazada", variant: "destructive" },
} as const;

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
  filters: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1.4fr) minmax(12rem, 0.8fr)",
    },
  },
  illustration: {
    width: "8rem",
    height: "8rem",
    objectFit: "contain",
  },
  list: {
    display: "grid",
  },
  header: {
    display: {
      default: "none",
      [media.md]: "grid",
    },
    gap: "0.75rem",
    paddingBottom: "0.5rem",
    color: colors.mutedForeground,
    gridTemplateColumns: {
      [media.md]: "minmax(0, 1.4fr) minmax(0, 1fr) auto auto",
    },
  },
  entry: {
    display: "grid",
    alignItems: "center",
    gap: "0.75rem",
    minHeight: "3.5rem",
    paddingBlock: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto",
      [media.md]: "minmax(0, 1.4fr) minmax(0, 1fr) auto auto",
    },
  },
  name: {
    minWidth: 0,
    fontWeight: 600,
  },
  club: {
    minWidth: 0,
    color: colors.mutedForeground,
    display: {
      default: "none",
      [media.md]: "block",
    },
  },
  empty: {
    paddingBlock: "0.5rem",
    color: colors.mutedForeground,
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
    margin: 0,
    color: colors.mutedForeground,
  },
  factValue: {
    margin: 0,
    fontWeight: 600,
    textAlign: "end",
  },
  aside: {
    display: "grid",
    gap: "1.5rem",
  },
});

function isStatusFilter(value: string): value is (typeof STATUS_FILTERS)[number]["value"] {
  return STATUS_FILTERS.some((item) => item.value === value);
}

export function ParticipantsStep({
  teams,
  participants,
  clubs,
  clubsPending,
  capacity,
  platformLabel,
  gameEdition,
  onRemove,
  disabled,
}: {
  teams: readonly TeamDto[];
  participants: readonly CompetitionEntryDto[];
  clubs: Readonly<Record<string, string>>;
  clubsPending: boolean;
  capacity: { readonly min: number; readonly max: number | null };
  platformLabel: string;
  gameEdition: string;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  const names = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const approved = participants.filter((entry) => entry.status === "approved").length;
  const pending = participants.filter((entry) => entry.status === "pending").length;
  const rejected = participants.filter((entry) => entry.status === "rejected").length;
  const needle = query.trim().toLocaleLowerCase();
  const visible = participants.filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    if (!needle) return true;
    const name = names.get(entry.teamId) ?? entry.teamId;
    return name.toLocaleLowerCase().includes(needle);
  });
  const minimumMet = approved >= capacity.min;

  return (
    <div {...applyStyles(styles.columns)}>
      <Card>
        <CardContent className={styles.cardBody}>
          <StepHeading
            badge={<Badge variant="neutral">{participants.length}</Badge>}
            copy="Revisa los equipos inscritos en la competición."
            title="Equipos participantes"
          />
          {participants.length === 0 ? null : (
            <div {...applyStyles(styles.filters)}>
              <Field>
                <FieldLabel htmlFor="participant-search">Buscar equipo</FieldLabel>
                <Input
                  id="participant-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar equipo"
                  value={query}
                />
              </Field>
              <SelectField
                disabled={false}
                id="participant-status"
                items={[...STATUS_FILTERS]}
                label="Estado"
                onChange={(value) => {
                  if (isStatusFilter(value)) setStatus(value);
                }}
                value={status}
              />
            </div>
          )}
          {participants.length === 0 ? (
            <ParticipantsEmpty />
          ) : (
            <>
              <div {...applyStyles(styles.list)}>
                <div {...applyStyles(typography.caption, styles.header)}>
                  <span>Equipo</span>
                  <span>Club EA</span>
                  <span>Estado</span>
                  <span />
                </div>
                {visible.length === 0 ? (
                  <p {...applyStyles(typography.caption, styles.empty)}>
                    Ningún equipo coincide con la búsqueda.
                  </p>
                ) : (
                  visible.map((entry) => (
                    <ParticipantRow
                      club={clubs[entry.teamId]}
                      clubsPending={clubsPending}
                      disabled={disabled}
                      entry={entry}
                      key={entry.id}
                      name={names.get(entry.teamId) ?? entry.teamId}
                      onRemove={onRemove}
                    />
                  ))
                )}
              </div>
              <p {...applyStyles(typography.caption, styles.factLabel)}>
                {participants.length === 1 ? "1 equipo" : `${participants.length} equipos`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className={styles.cardBody}>
          <div {...applyStyles(styles.aside)}>
            <div {...applyStyles(styles.aside)}>
              <StepHeading title="Participación" />
              <dl {...applyStyles(styles.facts)}>
                <Fact label="Confirmados" value={String(approved)} />
                <Fact label="Pendientes" value={String(pending)} />
                <Fact label="Rechazados" value={String(rejected)} />
                <Fact label="Mínimo requerido" value={String(capacity.min)} />
                <Fact
                  label="Máximo"
                  value={capacity.max === null ? "Sin límite" : String(capacity.max)}
                />
              </dl>
              <p {...applyStyles(typography.caption, styles.factLabel)}>
                {minimumMet
                  ? "Mínimo de equipos cumplido."
                  : `Faltan ${capacity.min - approved} equipos para el mínimo.`}
              </p>
            </div>
            <Separator />
            <div {...applyStyles(styles.aside)}>
              <StepHeading copy={`${platformLabel} · ${gameEdition}`} title="Asociación con EA" />
              <p {...applyStyles(typography.caption, styles.factLabel)}>
                Conectar un club es declarativo y no comprueba que el club sea de ese equipo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParticipantsEmpty() {
  const titleId = useId();
  return (
    <EmptyState aria-labelledby={titleId}>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={squadUrl} {...applyStyles(styles.illustration)} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>Aún no hay equipos</EmptyStateTitle>
        <EmptyStateDescription>
          Aparecerán aquí cuando alguien se postule con las inscripciones abiertas.
        </EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
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

function ParticipantRow({
  name,
  club,
  clubsPending,
  entry,
  disabled,
  onRemove,
}: {
  readonly name: string;
  readonly club: string | undefined;
  readonly clubsPending: boolean;
  readonly entry: CompetitionEntryDto;
  readonly disabled: boolean;
  readonly onRemove: (id: string) => Promise<void>;
}) {
  const clubLabel = club ?? (clubsPending ? "…" : "—");
  return (
    <div {...applyStyles(styles.entry)}>
      <span {...applyStyles(styles.name)}>{name}</span>
      <span {...applyStyles(typography.caption, styles.club)}>{clubLabel}</span>
      <EntryStatusBadge status={entry.status} />
      {entry.status === "approved" ? (
        <Button disabled={disabled} onClick={() => void onRemove(entry.id)} variant="ghost">
          Quitar
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}

function EntryStatusBadge({ status }: { readonly status: CompetitionEntryStatusDto }) {
  const badge = ENTRY_STATUS_BADGES[status];
  return (
    <Badge data-entry-status={status} variant={badge.variant}>
      {badge.label}
    </Badge>
  );
}
