"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AcceptInvitationForm } from "@/modules/organizations/presentation/accept-invitation-form.tsx";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";
import { OnboardingShell } from "@/modules/organizations/presentation/onboarding-shell.tsx";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void organizationsBrowserClient
      .resolvePostAuthDestination()
      .then(({ destination }) => {
        if (cancelled) {
          return;
        }
        if (destination.kind === "organization") {
          void navigate({
            to: "/orgs/$orgId",
            params: { orgId: destination.organizationId },
          });
          return;
        }
        if (destination.kind === "organizationPicker") {
          void navigate({ to: "/orgs" });
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-5 text-sm text-muted-foreground">
        Preparando tu espacio…
      </main>
    );
  }

  return (
    <OnboardingShell>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Crear organización</h2>
          <p className="text-sm text-muted-foreground">
            Ideal si organizas ligas, copas o encuentros.
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Aceptar invitación</h2>
          <p className="text-sm text-muted-foreground">
            Pega el token que te compartió un organizador o staff.
          </p>
        </div>
        <AcceptInvitationForm />
      </div>
    </OnboardingShell>
  );
}
