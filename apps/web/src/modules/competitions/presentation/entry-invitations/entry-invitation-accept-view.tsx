"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { EntryInvitationPreviewDto, GamePlatformDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Button,
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Skeleton,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";
import { InvitedCompetitionHeader } from "./invited-competition-header.tsx";
import {
  EntryInvitationUnavailable,
  entryInvitationUnavailableReason,
} from "./entry-invitation-unavailable.tsx";

export type EntryInvitationPreviewState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly error: CompetitionsClientError | null }
  | { readonly kind: "ready"; readonly preview: EntryInvitationPreviewDto };

const TEAM_NAME_MAX_LENGTH = 120;
/** `ChoiceGroup` value for typing a name instead of using a declared club. */
const OTHER_NAME = "__other__";

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
  fieldset: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
    borderWidth: 0,
    padding: 0,
  },
  // A `<legend>` is not a grid item, so the fieldset gap never reaches it.
  legend: {
    marginBottom: "0.75rem",
  },
  clubs: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  clubIndicator: {
    position: "absolute",
    left: "0.75rem",
    right: "auto",
    top: "50%",
    marginTop: "-0.625rem",
    width: "1.25rem",
    height: "1.25rem",
  },
  clubPill: {
    justifyContent: "center",
    textAlign: "center",
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
    case "error": {
      const reason = entryInvitationUnavailableReason(state.error?.code ?? null);
      if (reason) {
        return (
          <EntryInvitationUnavailable
            action={
              <Button render={<Link to="/player" />} role="link" variant="outline">
                Ir a mi espacio
              </Button>
            }
            reason={reason}
          />
        );
      }
      return (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden="true" />
          <AlertTitle>No puedes usar esta invitación</AlertTitle>
          <AlertDescription>
            {entryInvitationErrorMessage(state.error, "No pudimos cargar la invitación.")}
          </AlertDescription>
        </Alert>
      );
    }
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
  const ids = { legend: useId(), name: useId(), hint: useId() };
  const { competition, invitation, existing } = preview;
  const clubs = preview.suggestedTeamNames;
  // With several declared clubs the player picks one (or another name); none is preselected.
  const choosing = clubs.length > 1;
  const [choice, setChoice] = useState<string | null>(null);
  const [customName, setCustomName] = useState(clubs.length === 1 ? (clubs[0] ?? "") : "");
  const typing = !choosing || choice === OTHER_NAME;
  const teamName = typing ? customName : (choice ?? "");
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
      setError(
        choosing && choice === null
          ? "Elige uno de tus clubes o escribe otro nombre."
          : "Escribe el nombre de tu equipo.",
      );
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
        {choosing ? (
          <fieldset aria-describedby={ids.hint} {...applyStyles(styles.fieldset)}>
            <legend id={ids.legend} {...applyStyles(typography.label, styles.legend)}>
              Nombre de tu equipo
            </legend>
            <ChoiceGroup
              aria-invalid={error !== null && choice === null ? true : undefined}
              aria-labelledby={ids.legend}
              className={styles.clubs}
              onValueChange={(next: string) => {
                setChoice(next);
                setError(null);
              }}
              value={choice ?? ""}
            >
              {[...clubs, OTHER_NAME].map((value) => (
                <ChoiceGroupItem
                  appearance="pill"
                  className={styles.clubPill}
                  key={value}
                  value={value}
                >
                  <ChoiceGroupIndicator {...applyStyles(styles.clubIndicator)} />
                  {value === OTHER_NAME ? "Otro nombre" : value}
                </ChoiceGroupItem>
              ))}
            </ChoiceGroup>
            {typing ? (
              <Field>
                <FieldLabel htmlFor={ids.name}>Otro nombre</FieldLabel>
                <Input
                  aria-invalid={error !== null && !teamName.trim() ? true : undefined}
                  autoComplete="off"
                  id={ids.name}
                  maxLength={TEAM_NAME_MAX_LENGTH}
                  onChange={(event) => setCustomName(event.target.value)}
                  required
                  value={customName}
                />
              </Field>
            ) : null}
            <p id={ids.hint} {...applyStyles(typography.caption, styles.muted)}>
              Usa uno de tus clubes de EA o escribe otro nombre. Serás su capitán y el equipo
              quedará inscrito en la competición.
            </p>
          </fieldset>
        ) : (
          <Field>
            <FieldLabel htmlFor={ids.name}>Nombre de tu equipo</FieldLabel>
            <Input
              aria-describedby={ids.hint}
              aria-invalid={error !== null && !teamName.trim() ? true : undefined}
              autoComplete="off"
              id={ids.name}
              maxLength={TEAM_NAME_MAX_LENGTH}
              onChange={(event) => setCustomName(event.target.value)}
              required
              value={customName}
            />
            <FieldDescription id={ids.hint}>
              Serás su capitán y el equipo quedará inscrito en la competición.
            </FieldDescription>
          </Field>
        )}
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
        <InvitedCompetitionHeader competition={competition} platformLabel={platformLabel} />
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
