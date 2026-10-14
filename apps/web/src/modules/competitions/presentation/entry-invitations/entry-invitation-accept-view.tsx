"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import type { EntryInvitationPreviewDto, GamePlatformDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Skeleton,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { CheckCircleIcon, ShieldPlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";

export type EntryInvitationPreviewState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly error: CompetitionsClientError | null }
  | { readonly kind: "ready"; readonly preview: EntryInvitationPreviewDto };

const TEAM_NAME_MAX_LENGTH = 120;

const styles = stylex.create({
  body: {
    display: "grid",
    gap: "1.5rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  header: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    gap: "1rem",
  },
  icon: {
    width: "2.5rem",
    height: "2.5rem",
    color: colors.foreground,
  },
  headerText: {
    display: "grid",
    justifyItems: "start",
    gap: "0.375rem",
  },
  title: {
    margin: 0,
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
  quote: {
    margin: 0,
    borderInlineStartWidth: 2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: colors.borderSubtle,
    paddingInlineStart: "0.75rem",
    color: colors.foreground,
  },
  form: {
    display: "grid",
    gap: "1rem",
  },
  actions: {
    display: "flex",
    flexDirection: {
      default: "column",
      [media.sm]: "row",
    },
    gap: "0.5rem",
  },
  skeletonLine: {
    height: "1.5rem",
  },
  skeletonBlock: {
    height: "var(--control-height)",
  },
});

/**
 * What an invited player sees: the competition, the organizer's message and the name of
 * the team they bring. Pure view; the caller owns the server state and navigation.
 */
export function EntryInvitationAcceptView({
  state,
  platformLabel,
  onAccept,
  onDecline,
  onOpenCompetition,
}: {
  readonly state: EntryInvitationPreviewState;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly onAccept: (teamName: string) => Promise<void>;
  /** Only a directed invitation can be declined. */
  readonly onDecline?: () => Promise<void>;
  readonly onOpenCompetition: (competitionId: string) => void;
}) {
  switch (state.kind) {
    case "loading":
      return (
        <Card aria-busy="true" aria-label="Cargando invitación">
          <CardContent className={styles.body}>
            <Skeleton {...applyStyles(styles.skeletonLine)} />
            <Skeleton {...applyStyles(styles.skeletonBlock)} />
            <Skeleton {...applyStyles(styles.skeletonBlock)} />
          </CardContent>
        </Card>
      );
    case "error":
      return (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden="true" />
          <AlertTitle>No puedes usar esta invitación</AlertTitle>
          <AlertDescription>
            {entryInvitationErrorMessage(state.error, "No pudimos cargar la invitación.")}
          </AlertDescription>
        </Alert>
      );
    case "ready":
      return (
        <ReadyInvitation
          onAccept={onAccept}
          onDecline={state.preview.invitation.channel === "directed" ? onDecline : undefined}
          onOpenCompetition={onOpenCompetition}
          platformLabel={platformLabel}
          preview={state.preview}
        />
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function ReadyInvitation({
  preview,
  platformLabel,
  onAccept,
  onDecline,
  onOpenCompetition,
}: {
  readonly preview: EntryInvitationPreviewDto;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly onAccept: (teamName: string) => Promise<void>;
  readonly onDecline?: () => Promise<void>;
  readonly onOpenCompetition: (competitionId: string) => void;
}) {
  const ids = { name: useId(), hint: useId() };
  const { competition, invitation, existing } = preview;
  const [teamName, setTeamName] = useState(preview.suggestedTeamName ?? "");
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  async function run(kind: "accept" | "decline", action: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await action();
      if (kind === "decline") setDeclined(true);
    } catch (caught) {
      setError(
        entryInvitationErrorMessage(
          caught instanceof CompetitionsClientError ? caught : null,
          "No se pudo completar la invitación.",
        ),
      );
    } finally {
      setPending(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = teamName.trim();
    if (!name) {
      setError("Escribe el nombre de tu equipo.");
      return;
    }
    void run("accept", () => onAccept(name));
  }

  let body: ReactNode;
  if (existing) {
    body = (
      <>
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" />
          <AlertDescription>
            Ya inscribiste a {existing.teamName} en esta competición.
          </AlertDescription>
        </Alert>
        <div {...applyStyles(styles.actions)}>
          <Button onClick={() => onOpenCompetition(competition.id)} type="button">
            Ir a la competición
          </Button>
        </div>
      </>
    );
  } else if (declined) {
    body = (
      <p role="status" {...applyStyles(typography.body, styles.muted)}>
        Rechazaste la invitación. El organizador lo verá en su lista.
      </p>
    );
  } else {
    body = (
      <form noValidate onSubmit={submit} {...applyStyles(styles.form)}>
        <Field>
          <FieldLabel htmlFor={ids.name}>Nombre de tu equipo</FieldLabel>
          <Input
            aria-describedby={ids.hint}
            aria-invalid={error !== null && !teamName.trim() ? true : undefined}
            autoComplete="off"
            id={ids.name}
            maxLength={TEAM_NAME_MAX_LENGTH}
            onChange={(event) => setTeamName(event.target.value)}
            required
            value={teamName}
          />
          <FieldDescription id={ids.hint}>
            Serás su capitán y el equipo quedará inscrito en la competición.
          </FieldDescription>
        </Field>
        {error ? (
          <Alert variant="destructive">
            <WarningCircleIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div {...applyStyles(styles.actions)}>
          <Button
            aria-busy={pending === "accept" || undefined}
            disabled={pending !== null}
            type="submit"
          >
            {pending === "accept" ? "Inscribiendo…" : "Aceptar e inscribir equipo"}
          </Button>
          {onDecline ? (
            <Button
              aria-busy={pending === "decline" || undefined}
              disabled={pending !== null}
              onClick={() => void run("decline", onDecline)}
              type="button"
              variant="outline"
            >
              Rechazar
            </Button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <Card>
      <CardContent className={styles.body}>
        <div {...applyStyles(styles.header)}>
          <ShieldPlusIcon aria-hidden="true" {...applyStyles(styles.icon)} />
          <div {...applyStyles(styles.headerText)}>
            <h2 {...applyStyles(styles.title)}>{competition.name}</h2>
            <p {...applyStyles(typography.caption, styles.muted)}>
              Organiza {competition.organizationName}
            </p>
            <Badge variant="neutral">
              {competition.gameEdition} · {platformLabel(competition.platform)}
            </Badge>
          </div>
        </div>
        {invitation.message ? (
          <blockquote {...applyStyles(typography.body, styles.quote)}>
            {invitation.message}
          </blockquote>
        ) : null}
        {body}
      </CardContent>
    </Card>
  );
}
