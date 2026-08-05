"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Field,
  FieldLabel,
  Input,
  useCopyToClipboard,
} from "@futrob/ui";
import { Check, CircleAlert, Copy, Link2 } from "lucide-react";
import { buildInvitationShareUrl } from "@/modules/organizations/presentation/invitation-share-url.ts";
import { useCreateCompetitionInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";

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
    <section aria-labelledby="invite-link-title" className="mt-10 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold" id="invite-link-title">
          Invitar jugadores
        </h2>
        <p className="typo-caption text-muted-foreground">
          Genera un link de acceso a esta competición. Una persona puede usarlo una vez.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        disabled={createInvitation.isPending}
        onClick={() => void handleCreate()}
        type="button"
      >
        <Link2 aria-hidden="true" className="size-4" />
        Generar link de invitación
      </Button>

      {shareUrl ? (
        <div className="space-y-3 border-y border-border-subtle py-4">
          <Field name="shareUrl">
            <FieldLabel htmlFor="invitation-share-url">Link compartible</FieldLabel>
            <Input id="invitation-share-url" name="shareUrl" readOnly value={shareUrl} />
          </Field>
          <Button onClick={() => void handleCopy()} type="button" variant="outline">
            {isCopied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {isCopied ? "Copiado" : "Copiar link"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
