"use client";

import { Link } from "@tanstack/react-router";
import {
  Alert,
  AlertDescription,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import { Trophy } from "lucide-react";
import { useMyTeamsQuery } from "./player-queries.ts";

type PlayerCompetitionRow = {
  readonly competitionId: string;
  readonly teamName: string;
  readonly organizationId: string;
};

export function PlayerCompetitionsPage() {
  const teamsQuery = useMyTeamsQuery();
  const competitions = competitionsFromTeams(teamsQuery.data?.teams ?? []);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="space-y-3">
        <div className="space-y-3">
          <h1 className="typo-heading">Competiciones</h1>
          <p className="typo-subtitle max-w-xl text-muted-foreground">
            Competiciones en las que participas con un equipo.
          </p>
        </div>
      </header>

      <div className="mt-12 space-y-8">
        {teamsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {teamsQuery.isPending ? (
          <p className="typo-caption text-muted-foreground">Cargando competiciones…</p>
        ) : competitions.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <Trophy aria-hidden="true" />
            </EmptyStateIcon>
            <EmptyStateTitle>Sin competiciones todavía</EmptyStateTitle>
            <EmptyStateDescription>
              Cuando un organizador te añada a la plantilla de un equipo, la competición aparecerá
              aquí. También puedes aceptar una invitación.
            </EmptyStateDescription>
            <EmptyStateActions>
              <Button render={<Link to="/invitations/accept" />}>Aceptar invitación</Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
            {competitions.map((competition) => (
              <li
                className="flex min-h-(--control-height) items-center gap-4 px-4 py-3"
                key={competition.competitionId}
              >
                <span className="grid min-w-0 gap-1">
                  <span className="truncate font-semibold">
                    Competición {competition.competitionId}
                  </span>
                  <span className="typo-caption text-muted-foreground">
                    Equipo {competition.teamName}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function competitionsFromTeams(
  teams: readonly {
    readonly team: { readonly name: string; readonly organizationId: string };
    readonly membership: { readonly competitionId: string };
  }[],
): readonly PlayerCompetitionRow[] {
  const byId = new Map<string, PlayerCompetitionRow>();
  for (const item of teams) {
    const competitionId = item.membership.competitionId;
    if (byId.has(competitionId)) continue;
    byId.set(competitionId, {
      competitionId,
      teamName: item.team.name,
      organizationId: item.team.organizationId,
    });
  }
  return [...byId.values()];
}
