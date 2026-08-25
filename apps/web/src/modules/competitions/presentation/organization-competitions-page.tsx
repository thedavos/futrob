"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionDto, CompetitionStatusDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { TrophyIcon } from "@phosphor-icons/react";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { useOrganizationCompetitionsQuery } from "./competition-queries.ts";

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
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  row: {
    display: "flex",
    minHeight: "var(--control-height)",
    alignItems: "center",
    gap: "1rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    transitionProperty: "background-color, color, border-color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    backgroundColor: {
      default: null,
      ":hover": "color-mix(in oklab, var(--muted) 40%, transparent)",
    },
  },
  copy: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
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

const row = applyStyles(styles.row);

export function OrganizationCompetitionsPage({
  organizationId,
}: {
  readonly organizationId: string;
}) {
  const competitionsQuery = useOrganizationCompetitionsQuery(organizationId);
  const competitions = competitionsQuery.data?.competitions ?? [];
  const create = useCan({ organizationId }, COMPETITION_PERMISSION.update);
  const canCreate = create.allowed;

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <h1 {...applyStyles(typography.heading)}>Competiciones</h1>
        <p {...applyStyles(typography.subtitle, styles.lede)}>
          Competiciones que administra esta organización.
        </p>
      </header>

      <div {...applyStyles(styles.body)}>
        {competitionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {competitionsQuery.isPending ? (
          <p {...applyStyles(typography.caption, styles.status)}>Cargando competiciones…</p>
        ) : competitions.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <TrophyIcon aria-hidden="true" />
            </EmptyStateIcon>
            <EmptyStateTitle>Sin competiciones todavía</EmptyStateTitle>
            <EmptyStateDescription>
              Crea un borrador para definir edición, plataforma, región y formato. Después podrás
              completar el setup operativo.
            </EmptyStateDescription>
            {canCreate ? (
              <EmptyStateActions>
                <Button
                  render={
                    <Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions/new" />
                  }
                >
                  Nueva competición
                </Button>
              </EmptyStateActions>
            ) : null}
          </EmptyState>
        ) : (
          <ul {...applyStyles(styles.list)}>
            {competitions.map((competition) => (
              <CompetitionRow competition={competition} key={competition.id} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function CompetitionRow({ competition }: { readonly competition: CompetitionDto }) {
  const href =
    competition.status === "draft"
      ? ({
          to: "/orgs/$orgId/competitions/$competitionId/setup" as const,
          params: { orgId: competition.organizationId, competitionId: competition.id },
        } as const)
      : ({
          to: "/orgs/$orgId/competitions/$competitionId" as const,
          params: { orgId: competition.organizationId, competitionId: competition.id },
        } as const);

  return (
    <li {...applyStyles(styles.item)}>
      <Link className={row.className} params={href.params} style={row.style} to={href.to}>
        <span {...applyStyles(styles.copy)}>
          <span {...applyStyles(styles.name)}>{competition.name}</span>
          <span {...applyStyles(typography.caption, styles.meta)}>{competition.gameEdition}</span>
        </span>
        <Badge variant="neutral">{statusLabel(competition.status)}</Badge>
      </Link>
    </li>
  );
}

function statusLabel(status: CompetitionStatusDto): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "published":
      return "Publicada";
    case "paused":
      return "Pausada";
    case "finished":
      return "Finalizada";
    case "archived":
      return "Archivada";
  }
}
