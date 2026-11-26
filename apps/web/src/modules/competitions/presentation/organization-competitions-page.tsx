"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionDto, CompetitionStatusDto } from "@futrob/api-contracts";
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
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  typography,
} from "@futrob/ui";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import noCompetitionsUrl from "@/assets/illustration-no-matches.png";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { useOrganizationCompetitionsQuery } from "./competition-queries.ts";
import { styles } from "./organization-competitions-page.styles.ts";
import { OrganizationCompetitionsSkeleton } from "./organization-competitions-skeleton.tsx";

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
      <PageHeader>
        <PageHeaderTitle>Competiciones</PageHeaderTitle>
        <PageHeaderDescription>
          Competiciones que administra esta organización.
        </PageHeaderDescription>
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        {competitionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {competitionsQuery.isPending ? (
          <OrganizationCompetitionsSkeleton />
        ) : competitions.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <img alt="" data-outline="none" src={noCompetitionsUrl} />
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
    case "registration":
      return "Inscripciones abiertas";
    case "published":
      return "Publicada";
    case "paused":
      return "Pausada";
    case "finished":
      return "Finalizada";
    case "archived":
      return "Archivada";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
