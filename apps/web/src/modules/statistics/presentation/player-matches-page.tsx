"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerMatchContributionDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
  Stat,
  StatGroup,
  StatLabel,
  StatValue,
} from "@futrob/ui";
import { useMyMatchesQuery } from "./statistics-queries.ts";

const numberFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

export function PlayerMatchesPage() {
  const matchesQuery = useMyMatchesQuery();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader />

      {matchesQuery.isPending ? (
        <MatchesLoading />
      ) : matchesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>No pudimos cargar tus partidos.</span>
            <Button onClick={() => void matchesQuery.refetch()} variant="secondary">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : matchesQuery.data.matches.length === 0 ? (
        <OfficialHistoryEmpty />
      ) : (
        <ol
          aria-label="Historial de partidos oficiales"
          className="divide-y divide-border-subtle rounded-lg border border-border bg-surface"
        >
          {matchesQuery.data.matches.map((match) => (
            <MatchContributionRow key={match.id} match={match} />
          ))}
        </ol>
      )}
    </main>
  );
}

function PageHeader() {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">Espacio personal</p>
        <h1 className="typo-heading">Mis partidos</h1>
        <p className="typo-subtitle text-muted-foreground">
          Tu historial individual ordenado desde resultados oficiales aprobados.
        </p>
      </div>
      <Button render={<Link to="/player" />} variant="link">
        Volver al espacio personal
      </Button>
    </div>
  );
}

function MatchesLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando tus partidos" className="space-y-3">
      <p className="typo-caption text-muted-foreground">Cargando tus partidos…</p>
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
    </section>
  );
}

function OfficialHistoryEmpty() {
  return (
    <EmptyState>
      <EmptyStateTitle>Aún no hay partidos oficiales</EmptyStateTitle>
      <EmptyStateDescription>
        Vincula tus datos de juego y vuelve cuando una organización haya aprobado resultados que
        coincidan con tu jugador.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button render={<Link to="/player/game-accounts" />}>Revisar datos de juego</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

function MatchContributionRow({ match }: { readonly match: PlayerMatchContributionDto }) {
  const isPartial =
    match.correlationStatus !== "matched" ||
    [
      match.minutesPlayed,
      match.goals,
      match.assists,
      match.shots,
      match.passAttempts,
      match.passesMade,
      match.tackleAttempts,
      match.tacklesMade,
      match.saves,
      match.yellowCards,
      match.redCards,
      match.isMvp,
      match.rating,
    ].some((value) => value === null);

  return (
    <li className="px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{match.displayName}</p>
          <p className="typo-caption mt-1 text-muted-foreground">
            {match.gameEdition} · {platformLabel(match.platform)}
          </p>
          <p className="typo-caption mt-1 text-muted-foreground">
            {match.position ?? "Posición sin datos"} · {formatNullable(match.minutesPlayed, "min")}
          </p>
        </div>
        {isPartial ? <Badge variant="warning">Datos parciales</Badge> : <Badge>Completo</Badge>}
      </div>

      <StatGroup className="mt-5">
        <Stat>
          <StatLabel>Goles</StatLabel>
          <StatValue data-metric="goals">{formatNullable(match.goals)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Asistencias</StatLabel>
          <StatValue data-metric="assists">{formatNullable(match.assists)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Tiros</StatLabel>
          <StatValue>{formatNullable(match.shots)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Paradas</StatLabel>
          <StatValue>{formatNullable(match.saves)}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Rating</StatLabel>
          <StatValue>{formatNullable(match.rating)}</StatValue>
        </Stat>
      </StatGroup>
    </li>
  );
}

function formatNullable(value: number | null, suffix = ""): string {
  if (value === null) return "Sin datos";
  const formatted = numberFormat.format(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function platformLabel(platform: string): string {
  const labels: Readonly<Record<string, string>> = {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  };
  return labels[platform] ?? platform;
}
