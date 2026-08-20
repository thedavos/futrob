"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Logo } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";

export function AcceptInvitationDeepLink({ plainToken }: Readonly<{ plainToken: string }>) {
  const navigate = useNavigate();
  const acceptInvitation = useAcceptInvitationMutation();
  const [error, setError] = useState<SupportError | null>(null);
  const started = useRef(false);
  const retry = useRetryAfterCountdown();

  const acceptToken = useCallback(async () => {
    if (retry.blocked) return;
    setError(null);
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
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      retry.start(clientError?.retryAfterSeconds);
      setError({
        message: clientError?.retryAfterSeconds
          ? "Alcanzaste el límite temporal de invitaciones."
          : invitationAcceptErrorMessage(clientError),
        requestId: clientError?.requestId,
        retryAfterSeconds: clientError?.retryAfterSeconds,
      });
    }
  }, [acceptInvitation, navigate, plainToken, retry]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void acceptToken();
  }, [acceptToken]);

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
        <div className="grid gap-4">
          <SupportErrorAlert
            error={{ ...error, retryAfterSeconds: retry.remainingSeconds || undefined }}
          />
          <Button
            disabled={acceptInvitation.isPending || retry.blocked}
            onClick={() => void acceptToken()}
            type="button"
          >
            {acceptInvitation.isPending
              ? "Procesando…"
              : retry.blocked
                ? `Reintentar en ${retry.remainingSeconds} s`
                : "Reintentar invitación"}
          </Button>
        </div>
      ) : (
        <p className="typo-caption text-muted-foreground">Un momento…</p>
      )}
    </main>
  );
}
