"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { GamePlatformDto, PublicEntryInvitationLinkDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Card,
  CardContent,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { WarningCircleIcon } from "@phosphor-icons/react";
import type { CompetitionsClientError } from "../competitions-browser-client.ts";
import { InvitedCompetitionHeader } from "./invited-competition-header.tsx";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";
import { EntryInvitationUnavailable } from "./entry-invitation-unavailable.tsx";

/** What a signed-out visitor's link resolves to; the caller owns the request. */
export type PublicEntryInvitationState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly error: CompetitionsClientError | null }
  | { readonly kind: "ready"; readonly link: PublicEntryInvitationLinkDto };

const styles = stylex.create({
  body: {
    display: "grid",
    gap: "1.5rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
  // `media.sm` reads the viewport, not the card: wrap so the row never overflows a narrow host.
  actions: {
    display: "flex",
    flexDirection: {
      default: "column",
      [media.sm]: "row",
    },
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  errorIcon: {
    width: "2rem",
    height: "2rem",
  },
  skeletonLine: {
    height: "1.5rem",
  },
  skeletonBlock: {
    height: "var(--control-height)",
  },
});

/**
 * The invitation link for someone who is not signed in: the competition and a way into an
 * account that returns here to accept. Pure view; `redirectTo` is this page's own path.
 */
export function EntryInvitationPublicView({
  state,
  redirectTo,
  platformLabel,
  onRetry,
}: {
  readonly state: PublicEntryInvitationState;
  readonly redirectTo: string;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly onRetry: () => void;
}) {
  const titleId = useId();
  switch (state.kind) {
    case "loading":
      return (
        <Card aria-busy="true" aria-label="Cargando invitación">
          <CardContent className={styles.body}>
            <Skeleton {...applyStyles(styles.skeletonLine)} />
            <Skeleton {...applyStyles(styles.skeletonLine)} />
            <Skeleton {...applyStyles(styles.skeletonBlock)} />
          </CardContent>
        </Card>
      );
    case "error":
      return (
        <EmptyState aria-labelledby={titleId}>
          <EmptyStateIcon>
            <WarningCircleIcon aria-hidden="true" {...applyStyles(styles.errorIcon)} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle id={titleId}>No pudimos cargar la invitación</EmptyStateTitle>
            <EmptyStateDescription>
              {entryInvitationErrorMessage(
                state.error,
                "Revisa tu conexión y vuelve a intentarlo.",
              )}
            </EmptyStateDescription>
          </EmptyStateCopy>
          <EmptyStateActions>
            <Button onClick={onRetry} type="button" variant="outline">
              Reintentar
            </Button>
          </EmptyStateActions>
        </EmptyState>
      );
    case "ready": {
      const { link } = state;
      if (link.state === "unavailable") {
        return (
          <EntryInvitationUnavailable
            action={
              <Button render={<Link to="/" />} role="link" variant="outline">
                Conocer Futrob
              </Button>
            }
            reason={link.reason}
          />
        );
      }
      return (
        <Card>
          <CardContent className={styles.body}>
            <InvitedCompetitionHeader
              competition={link.competition}
              platformLabel={platformLabel}
            />
            <p {...applyStyles(typography.body, styles.muted)}>
              Al aceptar crearás tu equipo y serás su capitán. La inscripción queda confirmada al
              momento.
            </p>
            <div {...applyStyles(styles.actions)}>
              <Button render={<Link search={{ redirectTo }} to="/signup" />} role="link">
                Crear cuenta y aceptar
              </Button>
              <Button
                render={<Link search={{ redirectTo }} to="/login" />}
                role="link"
                variant="outline"
              >
                Ya tengo cuenta
              </Button>
            </div>
            <p {...applyStyles(typography.caption, styles.muted)}>
              Necesitas una cuenta de Futrob para inscribir tu equipo. Volverás aquí después.
            </p>
          </CardContent>
        </Card>
      );
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
