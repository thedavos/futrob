import { useState } from "react";
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
} from "@futrob/ui";
import type { PlayerGameAccountDto, PlayerTeamMembershipDto } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  useMyPlayerProfileQuery,
  useMyTeamsQuery,
  useSetActiveTeamMutation,
} from "./player-queries.ts";

export function PlayerWorkspacePage() {
  const { t } = useI18n();
  const [activeError, setActiveError] = useState<string | null>(null);
  const profileQuery = useMyPlayerProfileQuery();
  const teamsQuery = useMyTeamsQuery();
  const setActiveTeam = useSetActiveTeamMutation();

  const accounts = profileQuery.data?.gameAccounts ?? [];
  const teams = teamsQuery.data?.teams ?? [];
  const activeId = teamsQuery.data?.activeRosterMembershipId ?? "";
  const savingActive = setActiveTeam.isPending;

  async function handleActiveChange(value: string | null) {
    if (!value || value === activeId || savingActive) return;
    setActiveError(null);
    try {
      await setActiveTeam.mutateAsync({ rosterMembershipId: value });
    } catch {
      setActiveError("No se pudo guardar el equipo activo. Inténtalo de nuevo.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 max-w-2xl space-y-2">
        <p className="typo-label text-muted-foreground">Espacio personal</p>
        <h1 className="typo-heading text-3xl sm:text-4xl">Tu espacio de jugador</h1>
        <p className="typo-body text-muted-foreground">
          Consulta tus partidos y estadísticas individuales sin pertenecer todavía a una
          organización.
        </p>
      </div>

      <section className="divide-y divide-border-subtle rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="max-w-2xl">
            <h2 className="font-semibold">{t("player.matches.title")}</h2>
            <p className="typo-caption mt-1 text-muted-foreground">
              {t("player.matches.description")}
            </p>
          </div>
          <Button render={<Link to="/player/matches" />} variant="secondary">
            {t("player.matches.open")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="max-w-2xl">
            <h2 className="font-semibold">{t("player.statistics.title")}</h2>
            <p className="typo-caption mt-1 text-muted-foreground">
              {t("player.statistics.description")}
            </p>
          </div>
          <Button render={<Link to="/player/statistics" />} variant="secondary">
            {t("player.statistics.open")}
          </Button>
        </div>
      </section>

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
