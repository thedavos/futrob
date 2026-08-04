"use client";

import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@futrob/ui";
import { OrganizationPicker } from "@/modules/organizations/presentation/organization-picker.tsx";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";

export function OrgsIndexPage() {
  const navigate = useNavigate();
  const membershipsQuery = useMyMembershipsQuery();
  const memberships = membershipsQuery.data?.memberships;

  useEffect(() => {
    if (!memberships) {
      return;
    }
    if (memberships.length === 0) {
      void navigate({ to: "/onboarding" });
      return;
    }
    if (memberships.length === 1) {
      void navigate({
        to: "/orgs/$orgId",
        params: { orgId: memberships[0]!.organizationId },
      });
    }
  }, [memberships, navigate]);

  const showPicker = membershipsQuery.isError || (memberships != null && memberships.length > 1);

  if (!showPicker) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-5 text-sm text-muted-foreground">
        Cargando organizaciones…
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex items-center gap-2.5">
        <Logo className="h-8 w-auto" />
        <span className="font-semibold tracking-wide">Futrob</span>
      </header>
      <div className="mb-6 space-y-2">
        <h1 className="typo-heading">Tus organizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Elige con cuál quieres continuar.{" "}
          <Link className="underline-offset-4 hover:underline" to="/invitations/accept">
            Unirme a otra
          </Link>
        </p>
      </div>
      <OrganizationPicker />
    </main>
  );
}
