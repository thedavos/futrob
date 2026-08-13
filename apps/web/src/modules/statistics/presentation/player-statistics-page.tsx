"use client";

import { Link } from "@tanstack/react-router";
import type { PlayerPersonalStatsDto } from "@futrob/api-contracts";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { useMyStatisticsQuery } from "./statistics-queries.ts";

type StatisticMetric = keyof PlayerPersonalStatsDto["totals"];

const STATISTIC_METRICS = [
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const satisfies readonly StatisticMetric[];

const METRIC_LABELS: Record<StatisticMetric, string> = {
  goals: "Goles",
  assists: "Asistencias",
  shots: "Tiros",
  passAttempts: "Pases intentados",
  passesMade: "Pases completados",
  tackleAttempts: "Entradas intentadas",
  tacklesMade: "Entradas completadas",
  saves: "Paradas",
  yellowCards: "Tarjetas amarillas",
  redCards: "Tarjetas rojas",
  mvpAwards: "Premios MVP",
  rating: "Rating",
};

const numberFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

export function PlayerStatisticsPage() {
  const statisticsQuery = useMyStatisticsQuery();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader />

      {statisticsQuery.isPending ? (
        <StatisticsLoading />
      ) : statisticsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>No pudimos cargar tus estadísticas.</span>
            <Button onClick={() => void statisticsQuery.refetch()} variant="secondary">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : statisticsQuery.data.statistics === null ? (
        <OfficialHistoryEmpty />
      ) : (
        <StatisticsContent statistics={statisticsQuery.data.statistics} />
      )}
    </main>
  );
}

function PageHeader() {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">Espacio personal</p>
        <h1 className="typo-heading">Mis estadísticas</h1>
        <p className="typo-subtitle text-muted-foreground">
          Agregados individuales construidos únicamente desde resultados oficiales aprobados.
        </p>
      </div>
      <Button render={<Link to="/player" />} variant="link">
        Volver al espacio personal
      </Button>
    </div>
  );
}

function StatisticsLoading() {
  return (
    <section aria-busy="true" aria-label="Cargando tus estadísticas" className="space-y-4">
      <p className="typo-caption text-muted-foreground">Cargando tus estadísticas…</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-72" />
    </section>
  );
}

function OfficialHistoryEmpty() {
  return (
    <EmptyState>
      <EmptyStateTitle>Aún no hay estadísticas oficiales</EmptyStateTitle>
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

function StatisticsContent({ statistics }: { readonly statistics: PlayerPersonalStatsDto }) {
  const hasPartialData = Object.values(statistics.partial).some(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="typo-label">{statistics.matchesPlayed} partidos oficiales</h2>
            <p className="typo-caption mt-1 text-muted-foreground">
              Actualizado con la revisión oficial {statistics.sourceRevisionMax}.
            </p>
          </div>
          {hasPartialData ? <Badge variant="warning">Datos parciales</Badge> : null}
        </div>
        <StatGroup>
          <Stat>
            <StatLabel>Partidos</StatLabel>
            <StatValue>{statistics.matchesPlayed}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Minutos</StatLabel>
            <StatValue>{formatNumber(statistics.minutes)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Goles</StatLabel>
            <StatValue>{formatNumber(statistics.totals.goals)}</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Asistencias</StatLabel>
            <StatValue>{formatNumber(statistics.totals.assists)}</StatValue>
          </Stat>
        </StatGroup>
      </section>

      {hasPartialData ? (
        <Alert>
          <AlertDescription>
            Datos parciales. Algunas métricas no estuvieron disponibles en todos los partidos
            oficiales y se marcan en la tabla.
          </AlertDescription>
        </Alert>
      ) : null}

      <Table aria-label="Estadísticas oficiales del jugador" dense>
        <TableHeader>
          <TableRow>
            <TableHead>Métrica</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Promedio</TableHead>
            <TableHead className="text-right">Por 90</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STATISTIC_METRICS.map((metric) => (
            <TableRow key={metric}>
              <TableCell className="font-medium">{METRIC_LABELS[metric]}</TableCell>
              <TableCell className="typo-score text-right">
                {formatNumber(statistics.totals[metric])}
              </TableCell>
              <TableCell className="typo-score text-right">
                {formatNullableNumber(statistics.averages[metric])}
              </TableCell>
              <TableCell className="typo-score text-right">
                {formatNullableNumber(statistics.per90[metric])}
              </TableCell>
              <TableCell>
                {statistics.partial[metric] ? (
                  <Badge variant="warning">Datos parciales</Badge>
                ) : (
                  <span className="typo-caption text-muted-foreground">Completo</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatNullableNumber(value: number | null): string {
  return value === null ? "Sin datos" : formatNumber(value);
}

function formatNumber(value: number): string {
  return numberFormat.format(value);
}
