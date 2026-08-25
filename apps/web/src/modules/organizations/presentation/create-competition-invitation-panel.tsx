"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Field,
  FieldLabel,
  Input,
  typography,
  useCopyToClipboard,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { CheckIcon, WarningCircleIcon, CopyIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import { buildInvitationShareUrl } from "@/modules/organizations/presentation/invitation-share-url.ts";
import { useCreateCompetitionInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";

const styles = stylex.create({
  section: {
    marginTop: "2.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  title: {
    fontSize: "1.25rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  copy: {
    color: colors.mutedForeground,
  },
  icon: {
    width: "1rem",
    height: "1rem",
  },
  share: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    paddingBlock: "1rem",
  },
});

const icon = applyStyles(styles.icon);

export function CreateCompetitionInvitationPanel({
  organizationId,
  competitionId,
}: Readonly<{ organizationId: string; competitionId: string }>) {
  const createInvitation = useCreateCompetitionInvitationMutation(organizationId, competitionId);
  const { isCopied, copyToClipboard, reset: resetCopied } = useCopyToClipboard();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    resetCopied();
    try {
      const created = await createInvitation.mutateAsync({
        role: "player",
        redeemPolicy: "single",
      });
      setShareUrl(buildInvitationShareUrl(created.token));
    } catch {
      setError("No se pudo crear la invitación. Inténtalo de nuevo.");
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    const copied = await copyToClipboard(shareUrl);
    if (!copied) {
      setError("No pudimos copiar el link. Cópialo manualmente.");
    }
  }

  return (
    <section aria-labelledby="invite-link-title" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.header)}>
        <h2 {...applyStyles(styles.title)} id="invite-link-title">
          Invitar jugadores
        </h2>
        <p {...applyStyles(typography.caption, styles.copy)}>
          Genera un link de acceso a esta competición. Una persona puede usarlo una vez.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        disabled={createInvitation.isPending}
        onClick={() => void handleCreate()}
        type="button"
      >
        <LinkSimpleIcon aria-hidden="true" className={icon.className} style={icon.style} />
        Generar link de invitación
      </Button>

      {shareUrl ? (
        <div {...applyStyles(styles.share)}>
          <Field name="shareUrl">
            <FieldLabel htmlFor="invitation-share-url">Link compartible</FieldLabel>
            <Input id="invitation-share-url" name="shareUrl" readOnly value={shareUrl} />
          </Field>
          <Button onClick={() => void handleCopy()} type="button" variant="outline">
            {isCopied ? (
              <CheckIcon aria-hidden="true" className={icon.className} style={icon.style} />
            ) : (
              <CopyIcon aria-hidden="true" className={icon.className} style={icon.style} />
            )}
            {isCopied ? "Copiado" : "Copiar link"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
