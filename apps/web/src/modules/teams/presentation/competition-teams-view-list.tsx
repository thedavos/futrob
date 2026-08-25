"use client";

import type { CompetitionTeamManagementSummaryDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { CircleNotchIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { runAction } from "@/shared/presentation/run-action.ts";
import type { CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { EntryBadge } from "./competition-teams-view-entry.tsx";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  stack: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
  },
  skeleton: {
    height: "5rem",
  },
  emptyWrap: {
    minWidth: 0,
    padding: "1rem",
  },
  empty: {
    minHeight: "18rem",
    minWidth: 0,
  },
  nav: {
    display: "grid",
    gap: "0.25rem",
  },
  item: {
    minHeight: "4rem",
    borderRadius: "var(--corner-lg)",
    paddingInline: "0.75rem",
    paddingBlock: "0.75rem",
    textAlign: "start",
    transitionProperty: "background-color, color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    backgroundColor: {
      default: null,
      ":hover": colors.muted,
      ":is([aria-current=true])": colors.muted,
    },
    outlineWidth: {
      default: null,
      ":focus-visible": 0,
    },
    outlineStyle: {
      default: null,
      ":focus-visible": "none",
    },
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  name: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 600,
  },
  meta: {
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
  more: {
    width: "100%",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    animationName: {
      default: spin,
      [media.reduceMotion]: "none",
    },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

const skeleton = applyStyles(styles.skeleton);
const empty = applyStyles(styles.empty);
const more = applyStyles(styles.more);
const spinner = applyStyles(styles.spinner);

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
      <div aria-label="Cargando equipos" role="status" {...applyStyles(styles.stack)}>
        <Skeleton className={skeleton.className} style={skeleton.style} />
        <Skeleton className={skeleton.className} style={skeleton.style} />
        <Skeleton className={skeleton.className} style={skeleton.style} />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div {...applyStyles(styles.emptyWrap)}>
        <EmptyState className={empty.className} style={empty.style}>
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
    <div {...applyStyles(styles.stack)}>
      <nav aria-label="Equipos inscritos" {...applyStyles(styles.nav)}>
        {items.map((item) => (
          <button
            aria-current={selectedTeamId === item.team.id ? "true" : undefined}
            key={item.team.id}
            onClick={() => onSelectTeam(item.team.id)}
            type="button"
            {...applyStyles(styles.item)}
          >
            <span {...applyStyles(styles.row)}>
              <span {...applyStyles(styles.copy)}>
                <strong title={item.team.name} {...applyStyles(styles.name)}>
                  {item.team.name}
                </strong>
                <span {...applyStyles(typography.caption, styles.meta)}>
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
          className={more.className}
          dense
          disabled={loadingMoreTeams}
          onClick={() => runAction(onLoadMoreTeams)}
          style={more.style}
          variant="outline"
        >
          {loadingMoreTeams ? (
            <CircleNotchIcon
              aria-hidden="true"
              className={spinner.className}
              data-icon="inline-start"
              style={spinner.style}
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
