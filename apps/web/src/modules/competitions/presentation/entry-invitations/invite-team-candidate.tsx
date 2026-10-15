"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import type { EntryInviteeCandidateDto, GamePlatformDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Skeleton, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";

export type InviteeSearchState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly players: readonly EntryInviteeCandidateDto[] }
  | { readonly kind: "error" };

const styles = stylex.create({
  // Keeps the `aria-controls` target without adding an empty grid row (and a doubled gap).
  idle: {
    display: "contents",
  },
  results: {
    display: "grid",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  candidate: {
    display: "flex",
    width: "100%",
    minHeight: "4rem",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.borderSubtle,
      ":focus-visible": colors.ring,
    },
    backgroundColor: {
      default: colors.background,
      ":hover": colors.muted,
    },
    paddingInline: "0.75rem",
    paddingBlock: "0.625rem",
    textAlign: "start",
    color: colors.foreground,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": 0.6,
    },
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
    cursor: "default",
  },
  crest: {
    width: "2.5rem",
    height: "2.5rem",
  },
  crestFallback: {
    fontSize: "0.75rem",
    lineHeight: "1rem",
  },
  identity: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    gap: "0.125rem",
  },
  name: {
    overflow: "hidden",
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    color: colors.mutedForeground,
  },
  check: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
    color: colors.primary,
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
});

const crest = applyStyles(styles.crest);
const crestFallback = applyStyles(styles.crestFallback);

export function InviteeSearchResults({
  id,
  state,
  platformLabel,
  onSelect,
}: {
  readonly id: string;
  readonly state: InviteeSearchState;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly onSelect: (candidate: EntryInviteeCandidateDto) => void;
}) {
  switch (state.kind) {
    case "idle":
      return <div id={id} {...applyStyles(styles.idle)} />;
    case "loading":
      return (
        <div aria-busy="true" aria-label="Buscando jugadores" id={id} role="status">
          <Skeleton {...applyStyles(styles.candidate)} />
        </div>
      );
    case "error":
      return (
        <p id={id} role="alert" {...applyStyles(typography.caption, styles.muted)}>
          No pudimos buscar jugadores. Inténtalo de nuevo.
        </p>
      );
    case "ready":
      if (state.players.length === 0) {
        return (
          <p id={id} role="status" {...applyStyles(typography.caption, styles.muted)}>
            Ningún jugador coincide con ese gamertag.
          </p>
        );
      }
      return (
        <ul aria-label="Jugadores encontrados" id={id} {...applyStyles(styles.results)}>
          {state.players.map((candidate) => (
            <li key={candidate.actorId}>
              <InviteeCandidateCard
                candidate={candidate}
                onSelect={() => onSelect(candidate)}
                platformLabel={platformLabel}
              />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function unavailableReason(candidate: EntryInviteeCandidateDto): string | null {
  if (candidate.inCompetition) return "Ya participa";
  if (candidate.invitationPending) return "Invitación pendiente";
  return null;
}

export function InviteeCandidateCard({
  candidate,
  platformLabel,
  selected = false,
  onSelect,
  action,
}: {
  readonly candidate: EntryInviteeCandidateDto;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  /** Control shown at the end of a selected (non-interactive) card, e.g. to change the pick. */
  readonly action?: ReactNode;
}) {
  const title = candidate.club?.name ?? candidate.gamertag;
  const unavailable = unavailableReason(candidate);
  const content = (
    <>
      <ClubCrestAvatar
        className={crest.className}
        fallbackClassName={crestFallback.className}
        framed={!candidate.club?.imageUrl}
        imageUrl={candidate.club?.imageUrl ?? null}
        name={title}
        style={crest.style}
      />
      <span {...applyStyles(styles.identity)}>
        <span {...applyStyles(styles.name)}>{title}</span>
        <span {...applyStyles(typography.caption, styles.meta)}>
          {candidate.club ? `Capitán: ${candidate.gamertag}` : "Sin club declarado"}
        </span>
        <span {...applyStyles(typography.caption, styles.meta)}>
          {platformLabel(candidate.platform)} · {candidate.gameEdition}
        </span>
      </span>
      {unavailable ? <Badge variant="neutral">{unavailable}</Badge> : null}
      {selected ? <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.check)} /> : null}
      {selected ? action : null}
    </>
  );
  if (!onSelect) {
    return (
      <div
        aria-label={`Seleccionado: ${title}`}
        role="group"
        {...applyStyles(styles.candidate, selected && styles.selected)}
      >
        {content}
      </div>
    );
  }
  return (
    <button
      disabled={unavailable !== null}
      onClick={onSelect}
      type="button"
      {...applyStyles(styles.candidate)}
    >
      {content}
    </button>
  );
}
