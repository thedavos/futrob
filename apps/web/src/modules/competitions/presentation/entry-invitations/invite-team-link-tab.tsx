"use client";

import { useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
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
  Separator,
  Skeleton,
  typography,
  useCopyToClipboard,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  InfoIcon,
  LinkSimpleIcon,
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
  shareActions: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  facts: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1.4fr) minmax(0, 1fr)",
    },
  },
  fact: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  factIcon: {
    width: "1.25rem",
    height: "1.25rem",
    flexShrink: 0,
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
  factText: {
    display: "grid",
    gap: "0.25rem",
  },
  factTitle: {
    margin: 0,
    fontWeight: 600,
  },
  regenerate: {
    display: "grid",
    justifyItems: "start",
    gap: "0.25rem",
  },
  confirm: {
    display: "flex",
    flexWrap: "wrap",
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
  status: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
  },
  dot: {
    width: "0.5rem",
    height: "0.5rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.primary,
  },
  skeleton: {
    height: "var(--control-height)",
  },
});

/** «Por enlace»: the competition's shareable link, with copy, WhatsApp and regenerate. */
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
            {link.kind === "loading" ? (
              <Skeleton aria-label="Cargando enlace" {...applyStyles(styles.skeleton)} />
            ) : (
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
                    {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                  </Button>
                }
                id={ids.url}
                onFocus={(event) => event.currentTarget.select()}
                readOnly
                value={url}
              />
            )}
            <FieldDescription id={ids.urlHint}>
              Cada equipo deberá iniciar sesión y aceptar en Futrob.
            </FieldDescription>
          </Field>
          <div {...applyStyles(styles.shareActions)}>
            <Button
              disabled={link.kind !== "ready"}
              onClick={() => void copyToClipboard(url)}
              type="button"
            >
              {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {isCopied ? "Copiado" : "Copiar enlace"}
            </Button>
            {link.kind === "ready" ? (
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
            ) : (
              <Button disabled type="button" variant="outline">
                <WhatsappLogoIcon aria-hidden="true" />
                Compartir por WhatsApp
              </Button>
            )}
          </div>
          <span aria-live="polite" {...applyStyles(vis.srOnly)}>
            {isCopied ? "Enlace copiado al portapapeles" : ""}
          </span>
          <p {...applyStyles(typography.caption, styles.muted)}>
            Para Discord, copia el enlace y pégalo en tu servidor.
          </p>
        </>
      )}
      <Separator />
      <div {...applyStyles(styles.facts)}>
        <div {...applyStyles(styles.fact)}>
          <LinkSimpleIcon aria-hidden="true" {...applyStyles(styles.factIcon)} />
          <div {...applyStyles(styles.factText)}>
            <p {...applyStyles(styles.factTitle)}>Acceso por enlace</p>
            <p {...applyStyles(typography.caption, styles.muted)}>
              Disponible mientras el enlace esté activo. Quien lo acepte inscribe su equipo y será
              su capitán.
            </p>
          </div>
        </div>
        <div {...applyStyles(styles.regenerate)}>
          {confirming ? (
            <>
              <p {...applyStyles(typography.caption, styles.muted)}>
                ¿Regenerar? El enlace anterior dejará de funcionar.
              </p>
              <div {...applyStyles(styles.confirm)}>
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
            </>
          ) : (
            <>
              <Button
                disabled={link.kind !== "ready"}
                onClick={() => {
                  setConfirming(true);
                  setRegenerated(false);
                }}
                type="button"
                variant="ghost"
              >
                <ArrowsClockwiseIcon aria-hidden="true" />
                Regenerar enlace
              </Button>
              <p {...applyStyles(typography.caption, styles.muted)}>
                El enlace anterior dejará de funcionar.
              </p>
            </>
          )}
          {regenerateError ? (
            <p role="alert" {...applyStyles(typography.caption, styles.muted)}>
              {regenerateError}
            </p>
          ) : null}
          <span aria-live="polite" {...applyStyles(vis.srOnly)}>
            {regenerated ? "Enlace regenerado" : ""}
          </span>
        </div>
      </div>
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Compartir el enlace no inscribe al equipo. Se añadirá cuando acepte la invitación.
        </AlertDescription>
      </Alert>
      <div {...applyStyles(styles.footer)}>
        <p {...applyStyles(typography.caption, styles.status)}>
          {link.kind === "ready" ? (
            <>
              <span aria-hidden="true" {...applyStyles(styles.dot)} />
              Enlace activo
            </>
          ) : null}
        </p>
        <DialogClose render={<Button type="button" variant="outline" />}>Listo</DialogClose>
      </div>
    </div>
  );
}
