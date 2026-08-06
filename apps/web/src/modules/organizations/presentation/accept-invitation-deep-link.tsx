"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, Logo } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { WarningCircle } from "@phosphor-icons/react";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";

export function AcceptInvitationDeepLink({ plainToken }: Readonly<{ plainToken: string }>) {
  const navigate = useNavigate();
  const acceptInvitation = useAcceptInvitationMutation();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const accepted = await acceptInvitation.mutateAsync({ token: plainToken });
        if (accepted.destination.kind === "competition") {
          await navigate({
            to: "/orgs/$orgId/competitions/$competitionId",
            params: {
              orgId: accepted.destination.organizationId,
              competitionId: accepted.destination.competitionId,
            },
            replace: true,
          });
          return;
        }
        await navigate({
          to: "/orgs/$orgId",
          params: { orgId: accepted.organizationId },
          replace: true,
        });
      } catch (caught) {
        setError(invitationAcceptErrorMessage(caught));
      }
    })();
    // Accept once per mount for this token; mutation identity is unstable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot accept
  }, [plainToken]);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8">
      <header className="mb-10 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>
      <div className="mb-8 space-y-2">
        <h1 className="typo-heading">Únete a una competición</h1>
        <p className="typo-subtitle text-muted-foreground">
          {error ? "No se pudo completar la invitación." : "Estamos validando tu invitación…"}
        </p>
      </div>
      {error ? (
        <Alert variant="destructive">
          <WarningCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <p className="typo-caption text-muted-foreground">Un momento…</p>
      )}
    </main>
  );
}
