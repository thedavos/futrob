import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Logo,
} from "@futrob/ui";
import type { PlayerGameAccountDto, PlayerTeamMembershipDto } from "@futrob/api-contracts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

export function PlayerWorkspacePage() {
  const [accounts, setAccounts] = useState<PlayerGameAccountDto[]>([]);
  const [teams, setTeams] = useState<PlayerTeamMembershipDto[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [savingActive, setSavingActive] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([teamsBrowserClient.getMyProfile(), teamsBrowserClient.getMyTeams()])
      .then(([profile, mine]) => {
        if (cancelled) return;
        setAccounts(profile.gameAccounts);
        setTeams(mine.teams);
        setActiveId(mine.activeRosterMembershipId ?? "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleActiveChange(value: string | null) {
    if (!value || value === activeId || savingActive) return;
    setSavingActive(true);
    setActiveError(null);
    try {
      await teamsBrowserClient.setActiveTeam({ rosterMembershipId: value });
      setActiveId(value);
      setTeams((current) =>
        current.map((item) => ({
          ...item,
          active: item.membership.id === value,
        })),
      );
    } catch {
      setActiveError("No pudimos guardar tu equipo activo. Inténtalo nuevamente.");
    } finally {
      setSavingActive(false);
    }
  }

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
        <div className="mb-4">
          <h2 className="text-base font-semibold">Mis equipos</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Puedes pertenecer a varios equipos en competiciones distintas. Elige uno como activo
            para tu espacio personal.
          </p>
        </div>
        {teams.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>Sin plantillas todavía</EmptyStateTitle>
            <EmptyStateDescription>
              Cuando un organizador te añada a la plantilla de un equipo, aparecerá aquí.
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ChoiceGroup<string>
            aria-label="Equipo activo"
            className="grid-cols-1"
            disabled={savingActive}
            onValueChange={(value) => void handleActiveChange(value)}
            value={activeId}
          >
            {teams.map((item) => (
              <ChoiceGroupItem
                appearance="tile"
                key={item.membership.id}
                value={item.membership.id}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="grid gap-1 text-left">
                    <span className="font-semibold">{item.team.name}</span>
                    <span className="typo-caption text-muted-foreground">
                      Competición {item.membership.competitionId} · Rol{" "}
                      {rosterRoleLabel(item.membership.role)}
                    </span>
                  </span>
                  <ChoiceGroupIndicator />
                </span>
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
        )}
        {activeError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {activeError}
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Datos de juego</h2>
            {accounts.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {accounts.map((account) => (
                  <div className="flex flex-wrap items-center gap-2 text-sm" key={account.id}>
                    <span>
                      {account.identifier} · {platformLabel(account.platform)} ·{" "}
                      {account.gameEdition}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Vincula un identificador para preparar la asociación con tus partidos oficiales.
              </p>
            )}
          </div>
          <Button render={<Link to="/player/game-accounts" />} variant="secondary">
            {accounts.length > 0 ? "Administrar cuentas" : "Vincular cuenta"}
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold">¿Quieres competir en una organización?</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Puedes aceptar una invitación o crear una organización más adelante. Tu espacio personal y
          tu historial se conservarán.
        </p>
        <EmptyStateActions className="mt-5 justify-start">
          <Button render={<Link to="/invitations/accept" />}>Aceptar invitación</Button>
          <Button render={<Link to="/orgs/new" />} variant="secondary">
            Crear organización
          </Button>
        </EmptyStateActions>
      </section>
    </main>
  );
}

function platformLabel(platform: PlayerGameAccountDto["platform"]): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}

function rosterRoleLabel(role: PlayerTeamMembershipDto["membership"]["role"]): string {
  return {
    player: "Jugador",
    captain: "Capitán",
    vice_captain: "Subcapitán",
  }[role];
}
