"use client";

import { useEffect, useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { EntryInviteeCandidateDto, GamePlatformDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  DialogClose,
  Field,
  FieldDescription,
  FieldLabel,
  InputWithIcon,
  Textarea,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useDebouncedValue } from "../explore/use-debounced-value.ts";
import {
  InviteeCandidateCard,
  InviteeSearchResults,
  type InviteeSearchState,
} from "./invite-team-candidate.tsx";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";

export const ENTRY_INVITEE_SEARCH_MIN_LENGTH = 3;
export const ENTRY_INVITATION_MESSAGE_MAX_LENGTH = 280;

export interface InviteTeamCaptainInput {
  readonly inviteeActorId: string;
  readonly inviteeLabel: string;
  readonly message: string | null;
}

const styles = stylex.create({
  body: {
    display: "grid",
    gap: "1.25rem",
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
  labelRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  footer: {
    display: "flex",
    flexDirection: {
      default: "column-reverse",
      [media.sm]: "row",
    },
    alignItems: {
      default: "stretch",
      [media.sm]: "center",
    },
    gap: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    paddingTop: "1rem",
  },
  footerStatus: {
    flexGrow: 1,
    margin: 0,
    color: colors.mutedForeground,
  },
  footerActions: {
    display: "flex",
    flexDirection: {
      default: "column-reverse",
      [media.sm]: "row",
    },
    gap: "0.5rem",
  },
});

/**
 * «Equipo en Futrob»: find a player by gamertag and invite them to bring a team. The
 * player becomes the team's captain when they accept.
 */
export function InviteTeamFutrobTab({
  platformLabel,
  searchPlayers,
  onInvite,
}: {
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly searchPlayers: (query: string) => Promise<readonly EntryInviteeCandidateDto[]>;
  readonly onInvite: (input: InviteTeamCaptainInput) => Promise<void>;
}) {
  const ids = {
    search: useId(),
    searchHint: useId(),
    message: useId(),
    messageHint: useId(),
    results: useId(),
  };
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [search, setSearch] = useState<InviteeSearchState>({ kind: "idle" });
  const [selected, setSelected] = useState<EntryInviteeCandidateDto | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (debouncedQuery.length < ENTRY_INVITEE_SEARCH_MIN_LENGTH) {
      setSearch({ kind: "idle" });
      return;
    }
    let current = true;
    setSearch({ kind: "loading" });
    searchPlayers(debouncedQuery).then(
      (players) => {
        if (current) setSearch({ kind: "ready", players });
      },
      () => {
        if (current) setSearch({ kind: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [debouncedQuery, searchPlayers]);

  async function send() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      await onInvite({
        inviteeActorId: selected.actorId,
        inviteeLabel: selected.gamertag,
        message: message.trim() || null,
      });
      setSentTo(selected.gamertag);
      setSelected(null);
      setMessage("");
      setQuery("");
    } catch (caught) {
      setError(
        entryInvitationErrorMessage(
          caught instanceof CompetitionsClientError ? caught : null,
          "No se pudo enviar la invitación.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div {...applyStyles(styles.body)}>
      {sentTo ? (
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" />
          <AlertDescription>
            Invitación enviada a {sentTo}. Puedes invitar a otro jugador.
          </AlertDescription>
        </Alert>
      ) : null}
      {selected ? (
        <div {...applyStyles(styles.body)}>
          <InviteeCandidateCard candidate={selected} platformLabel={platformLabel} selected />
          <div>
            <Button
              onClick={() => {
                setSelected(null);
                setError(null);
              }}
              type="button"
              variant="link"
            >
              Cambiar jugador
            </Button>
          </div>
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor={ids.search}>Buscar capitán</FieldLabel>
          <InputWithIcon
            aria-controls={ids.results}
            aria-describedby={ids.searchHint}
            autoComplete="off"
            endAction={
              query ? (
                <Button
                  aria-label="Borrar búsqueda"
                  onClick={() => setQuery("")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              ) : undefined
            }
            id={ids.search}
            onChange={(event) => {
              setQuery(event.target.value);
              setSentTo(null);
            }}
            placeholder="Gamertag del jugador"
            startIcon={MagnifyingGlassIcon}
            type="search"
            value={query}
          />
          <FieldDescription id={ids.searchHint}>
            Busca por gamertag a un jugador registrado en Futrob. Escribe al menos{" "}
            {ENTRY_INVITEE_SEARCH_MIN_LENGTH} caracteres.
          </FieldDescription>
        </Field>
      )}
      {selected ? null : (
        <InviteeSearchResults
          id={ids.results}
          onSelect={(candidate) => {
            setSelected(candidate);
            setError(null);
          }}
          platformLabel={platformLabel}
          state={search}
        />
      )}
      {selected ? (
        <Field>
          <div {...applyStyles(styles.labelRow)}>
            <FieldLabel htmlFor={ids.message}>Mensaje</FieldLabel>
            <span {...applyStyles(typography.caption, styles.muted)}>Opcional</span>
          </div>
          <Textarea
            aria-describedby={ids.messageHint}
            id={ids.message}
            maxLength={ENTRY_INVITATION_MESSAGE_MAX_LENGTH}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={`¡Hola! Nos gustaría contar con tu equipo.`}
            rows={3}
            value={message}
          />
          <FieldDescription id={ids.messageHint}>
            {message.length}/{ENTRY_INVITATION_MESSAGE_MAX_LENGTH} caracteres
          </FieldDescription>
        </Field>
      ) : null}
      <Alert>
        <EnvelopeSimpleIcon aria-hidden="true" />
        <AlertDescription>
          El jugador recibirá la invitación en Futrob. Al aceptarla, nombrará su equipo y será su
          capitán.
        </AlertDescription>
      </Alert>
      {error ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div {...applyStyles(styles.footer)}>
        <p aria-live="polite" {...applyStyles(typography.caption, styles.footerStatus)}>
          {selected ? "1 jugador seleccionado" : "Ningún jugador seleccionado"}
        </p>
        <div {...applyStyles(styles.footerActions)}>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button
            aria-busy={sending || undefined}
            disabled={!selected || sending}
            onClick={() => void send()}
            type="button"
          >
            {sending ? "Enviando…" : "Enviar invitación"}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
