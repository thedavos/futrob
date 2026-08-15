"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionDto, CompetitionStatusDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import { TrophyIcon } from "@phosphor-icons/react";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { useOrganizationCompetitionsQuery } from "./competition-queries.ts";

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
    <main className="w-full">
      <header className="space-y-3">
        <h1 className="typo-heading">Competiciones</h1>
        <p className="typo-subtitle max-w-xl text-muted-foreground">
          Competiciones que administra esta organización.
        </p>
      </header>

      <div className="mt-12 space-y-8">
        {competitionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {competitionsQuery.isPending ? (
          <p className="typo-caption text-muted-foreground">Cargando competiciones…</p>
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
          <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface">
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
    <li>
      <Link
        className="flex min-h-(--control-height) items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
        params={href.params}
        to={href.to}
      >
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="truncate font-semibold">{competition.name}</span>
          <span className="typo-caption text-muted-foreground">{competition.gameEdition}</span>
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
