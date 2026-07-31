"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { MembershipSummaryDto } from "@futrob/api-contracts";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";

const ROLE_LABEL: Record<MembershipSummaryDto["role"], string> = {
  organizer: "Organizador",
  staff: "Staff",
  captain: "Capitán",
  player: "Jugador",
};

export function OrganizationPicker() {
  const [memberships, setMemberships] = useState<MembershipSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void organizationsBrowserClient
      .listMine()
      .then((response) => {
        if (!cancelled) {
          setMemberships(response.memberships);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudieron cargar tus organizaciones.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (memberships == null) {
    return <p className="text-sm text-muted-foreground">Cargando organizaciones…</p>;
  }

  if (memberships.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no perteneces a ninguna organización. Puedes{" "}
        <Link className="underline-offset-4 hover:underline" to="/orgs/new">
          crear una
        </Link>{" "}
        o{" "}
        <Link className="underline-offset-4 hover:underline" to="/invitations/accept">
          aceptar una invitación
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-subtle border-y border-border-subtle">
      {memberships.map((membership) => (
        <li key={membership.organizationId}>
          <Link
            className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-primary"
            params={{ orgId: membership.organizationId }}
            to="/orgs/$orgId"
          >
            <span className="font-medium">{membership.organizationName}</span>
            <span className="text-sm text-muted-foreground">{ROLE_LABEL[membership.role]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
