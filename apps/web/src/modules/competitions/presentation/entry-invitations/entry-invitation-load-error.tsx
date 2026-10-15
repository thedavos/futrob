"use client";

import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import retryUrl from "@/assets/illustration-game-data-sync.png";
import type { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";

const styles = stylex.create({
  illustration: {
    width: "8rem",
    height: "8rem",
    objectFit: "contain",
  },
});

/** An invitation that failed to load for a reason that may pass, with a retry. */
export function EntryInvitationLoadError({
  error,
  onRetry,
}: {
  readonly error: CompetitionsClientError | null;
  readonly onRetry: () => void;
}) {
  const titleId = useId();
  return (
    <EmptyState aria-labelledby={titleId}>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={retryUrl} {...applyStyles(styles.illustration)} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>No pudimos cargar la invitación</EmptyStateTitle>
        <EmptyStateDescription>
          {entryInvitationErrorMessage(error, "Revisa tu conexión y vuelve a intentarlo.")}
        </EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button onClick={onRetry} type="button" variant="outline">
          Reintentar
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );
}
