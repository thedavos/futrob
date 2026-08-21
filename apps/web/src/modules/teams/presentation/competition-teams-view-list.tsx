"use client";

import type { CompetitionTeamManagementSummaryDto } from "@futrob/api-contracts";
import {
  Button,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import { CircleNotchIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { runAction } from "@/shared/presentation/run-action.ts";
import type { CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { EntryBadge } from "./competition-teams-view-entry.tsx";

export function TeamList({
  items,
  loadingList,
  selectedTeamId,
  onSelectTeam,
  hasMoreTeams,
  loadingMoreTeams,
  onLoadMoreTeams,
}: CompetitionTeamsViewProps) {
  if (loadingList) {
    return (
      <div aria-label="Cargando equipos" className="grid gap-3 p-4" role="status">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="min-w-0 p-4">
        <EmptyState className="min-h-72 min-w-0">
          <EmptyStateIcon>
            <UsersThreeIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>Sin equipos todavía</EmptyStateTitle>
          <EmptyStateDescription>Aparecerán aquí al inscribirse.</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="grid gap-3 p-4">
      <nav aria-label="Equipos inscritos" className="grid gap-1">
        {items.map((item) => (
          <button
            aria-current={selectedTeamId === item.team.id ? "true" : undefined}
            className="min-h-16 rounded-lg px-3 py-3 text-start transition-[background-color,color] duration-(--duration-fast) ease-(--ease-standard) hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 aria-current:bg-muted"
            key={item.team.id}
            onClick={() => onSelectTeam(item.team.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1">
                <strong className="block truncate text-sm font-semibold" title={item.team.name}>
                  {item.team.name}
                </strong>
                <span className="typo-caption tabular-nums text-muted-foreground">
                  {item.roster.memberCount}/{item.roster.maxSize} jugadores · {rosterState(item)}
                </span>
              </span>
              <EntryBadge status={item.entry.status} />
            </span>
          </button>
        ))}
      </nav>
      {hasMoreTeams && onLoadMoreTeams ? (
        <Button
          aria-busy={loadingMoreTeams || undefined}
          className="w-full"
          dense
          disabled={loadingMoreTeams}
          onClick={() => runAction(onLoadMoreTeams)}
          variant="outline"
        >
          {loadingMoreTeams ? (
            <CircleNotchIcon
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          Cargar más equipos
        </Button>
      ) : null}
    </div>
  );
}

function rosterState(item: CompetitionTeamManagementSummaryDto): string {
  return item.roster.state === "open" ? "abierta" : "cerrada";
}
