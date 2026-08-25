"use client";

import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  colors,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  typography,
} from "@futrob/ui";
import { TrophyIcon } from "@phosphor-icons/react";
import { useMyTeamsQuery } from "./player-queries.ts";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  lede: {
    maxWidth: "36rem",
    color: colors.mutedForeground,
  },
  body: {
    marginTop: "3rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  status: {
    color: colors.mutedForeground,
  },
  list: {
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  item: {
    display: "flex",
    minHeight: "var(--control-height)",
    alignItems: "center",
    gap: "1rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  meta: {
    color: colors.mutedForeground,
  },
});

type PlayerCompetitionRow = {
  readonly competitionId: string;
  readonly teamName: string;
  readonly organizationId: string;
};

export function PlayerCompetitionsPage() {
  const teamsQuery = useMyTeamsQuery();
  const competitions = competitionsFromTeams(teamsQuery.data?.teams ?? []);

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.header)}>
          <h1 {...applyStyles(typography.heading)}>Competiciones</h1>
          <p {...applyStyles(typography.subtitle, styles.lede)}>
            Competiciones en las que participas con un equipo.
          </p>
        </div>
      </header>

      <div {...applyStyles(styles.body)}>
        {teamsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {teamsQuery.isPending ? (
          <p {...applyStyles(typography.caption, styles.status)}>Cargando competiciones…</p>
        ) : competitions.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <TrophyIcon aria-hidden="true" />
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
          <ul {...applyStyles(styles.list)}>
            {competitions.map((competition) => (
              <li key={competition.competitionId} {...applyStyles(styles.item)}>
                <span {...applyStyles(styles.copy)}>
                  <span {...applyStyles(styles.name)}>
                    Competición {competition.competitionId}
                  </span>
                  <span {...applyStyles(typography.caption, styles.meta)}>
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
