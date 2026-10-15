"use client";

import { useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  DialogClose,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Field,
  FieldDescription,
  FieldLabel,
  InputWithIcon,
  typography,
  useCopyToClipboard,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  InfoIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { entryInvitationErrorMessage } from "./entry-invitation-copy.ts";

/** The competition link as the dialog shows it; `url` is the full browser URL. */
export type InvitationLinkState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly url: string; readonly whatsAppUrl: string }
  | { readonly kind: "error"; readonly error: CompetitionsClientError | null };

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  body: {
    display: "grid",
    gap: "1.25rem",
  },
  intro: {
    display: "grid",
    gap: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "1.125rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  muted: {
    margin: 0,
    color: colors.mutedForeground,
  },
  // Same control → hint rhythm as `Field`, so the Discord hint matches the link hint.
  share: {
    display: "grid",
    gap: "0.5rem",
  },
  shareActions: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  confirm: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    paddingTop: "1rem",
  },
  linkState: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
  },
  footerError: {
    flexBasis: "100%",
  },
  dot: {
    width: "0.5rem",
    height: "0.5rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.primary,
  },
  spinner: {
    width: "2rem",
    height: "2rem",
    animationName: {
      default: spin,
      [media.reduceMotion]: "none",
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

/**
 * «Por enlace»: the competition's shareable link, with copy and WhatsApp. Regenerating lives in
 * the footer next to the link status, and confirms in place because it revokes the old link.
 */
export function InviteTeamLinkTab({
  link,
  onRetry,
  onRegenerate,
}: {
  readonly link: InvitationLinkState;
  readonly onRetry: () => void;
  readonly onRegenerate: () => Promise<void>;
}) {
  const ids = { url: useId(), urlHint: useId() };
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [confirming, setConfirming] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerated, setRegenerated] = useState(false);
  const url = link.kind === "ready" ? link.url : "";

  async function regenerate() {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      await onRegenerate();
      setConfirming(false);
      setRegenerated(true);
    } catch (caught) {
      setRegenerateError(
        entryInvitationErrorMessage(
          caught instanceof CompetitionsClientError ? caught : null,
          "No se pudo regenerar el enlace.",
        ),
      );
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div {...applyStyles(styles.body)}>
      {link.kind === "loading" ? (
        <EmptyState aria-busy="true" aria-label="Cargando enlace" role="status">
          <EmptyStateIcon>
            <CircleNotchIcon aria-hidden="true" {...applyStyles(styles.spinner)} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>Preparando el enlace</EmptyStateTitle>
            <EmptyStateDescription>
              Estamos cargando el enlace de invitación de esta competición.
            </EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      ) : (
        <>
          <div {...applyStyles(styles.intro)}>
            <h3 {...applyStyles(styles.title)}>Comparte la invitación</h3>
            <p {...applyStyles(typography.caption, styles.muted)}>
              Envía este enlace por WhatsApp, Discord o donde prefieras.
            </p>
          </div>
          {link.kind === "error" ? (
            <Alert variant="destructive">
              <WarningCircleIcon aria-hidden="true" />
              <AlertDescription>
                {entryInvitationErrorMessage(link.error, "No pudimos cargar el enlace.")}{" "}
                <Button onClick={onRetry} type="button" variant="link">
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor={ids.url}>Enlace de invitación</FieldLabel>
                <InputWithIcon
                  aria-describedby={ids.urlHint}
                  endAction={
                    <Button
                      aria-label="Copiar enlace al portapapeles"
                      onClick={() => void copyToClipboard(url)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      {isCopied ? (
                        <CheckIcon aria-hidden="true" />
                      ) : (
                        <CopyIcon aria-hidden="true" />
                      )}
                    </Button>
                  }
                  id={ids.url}
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={url}
                />
                <FieldDescription id={ids.urlHint}>
                  Cada equipo deberá iniciar sesión y aceptar en Futrob.
                </FieldDescription>
              </Field>
              <div {...applyStyles(styles.share)}>
                <div {...applyStyles(styles.shareActions)}>
                  <Button onClick={() => void copyToClipboard(url)} type="button">
                    {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                    {isCopied ? "Copiado" : "Copiar enlace"}
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<a href={link.whatsAppUrl} rel="noopener noreferrer" target="_blank" />}
                    // An external share target navigates; Base UI would announce it as a button.
                    role="link"
                    variant="outline"
                  >
                    <WhatsappLogoIcon aria-hidden="true" />
                    Compartir por WhatsApp
                  </Button>
                </div>
                <span aria-live="polite" {...applyStyles(vis.srOnly)}>
                  {isCopied ? "Enlace copiado al portapapeles" : ""}
                </span>
                <p {...applyStyles(typography.caption, styles.muted)}>
                  Para Discord, copia el enlace y pégalo en tu servidor.
                </p>
              </div>
            </>
          )}
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Quien acepte el enlace inscribe su equipo y será su capitán. Compartirlo no inscribe a
              nadie hasta que acepten.
            </AlertDescription>
          </Alert>
        </>
      )}
      <div {...applyStyles(styles.footer)}>
        {confirming ? (
          <div {...applyStyles(styles.confirm)}>
            <p {...applyStyles(typography.caption, styles.muted)}>
              ¿Regenerar? El enlace anterior dejará de funcionar.
            </p>
            <Button
              disabled={regenerating}
              onClick={() => setConfirming(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              aria-busy={regenerating || undefined}
              disabled={regenerating}
              onClick={() => void regenerate()}
              type="button"
              variant="outline"
            >
              Regenerar
            </Button>
          </div>
        ) : (
          <div {...applyStyles(styles.linkState)}>
            {link.kind === "ready" ? (
              <p {...applyStyles(typography.caption, styles.status)}>
                <span aria-hidden="true" {...applyStyles(styles.dot)} />
                Enlace activo
              </p>
            ) : null}
            {link.kind === "ready" ? (
              <Button
                aria-label="Regenerar enlace"
                onClick={() => {
                  setConfirming(true);
                  setRegenerated(false);
                }}
                type="button"
                variant="ghost"
              >
                <ArrowsClockwiseIcon aria-hidden="true" />
                Regenerar
              </Button>
            ) : null}
          </div>
        )}
        {/* The pending regenerate decision owns the footer until it is confirmed or cancelled. */}
        {confirming ? null : (
          <DialogClose render={<Button type="button" variant="outline" />}>Listo</DialogClose>
        )}
        {regenerateError ? (
          <p role="alert" {...applyStyles(typography.caption, styles.muted, styles.footerError)}>
            {regenerateError}
          </p>
        ) : null}
        <span aria-live="polite" {...applyStyles(vis.srOnly)}>
          {regenerated ? "Enlace regenerado" : ""}
        </span>
      </div>
    </div>
  );
}
