import { Link } from "@tanstack/react-router";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Logo,
} from "@futrob/ui";

export function PlayerWorkspacePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>

      <header className="mb-8 max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">Espacio personal</p>
        <h1 className="typo-heading text-3xl sm:text-4xl">Tu espacio de jugador</h1>
        <p className="typo-body text-muted-foreground">
          Consulta tus partidos y estadísticas individuales sin pertenecer todavía a una
          organización.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <EmptyState>
          <EmptyStateTitle>Mis partidos</EmptyStateTitle>
          <EmptyStateDescription>
            Cuando vincules tu identificador de juego y existan resultados oficiales asociados,
            aparecerán aquí.
          </EmptyStateDescription>
        </EmptyState>
        <EmptyState>
          <EmptyStateTitle>Mis estadísticas</EmptyStateTitle>
          <EmptyStateDescription>
            Tus goles, asistencias, rating y otras métricas se construirán desde partidos oficiales
            aprobados.
          </EmptyStateDescription>
        </EmptyState>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold">¿Quieres competir en una organización?</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Puedes aceptar una invitación o crear una organización más adelante. Tu espacio personal y
          tu historial se conservarán.
        </p>
        <EmptyStateActions className="mt-5 justify-start">
          <Button render={<Link to="/onboarding" />}>Ver opciones</Button>
        </EmptyStateActions>
      </section>
    </main>
  );
}
