"use client";

import { Link } from "@tanstack/react-router";
import type { MembershipSummaryDto } from "@futrob/api-contracts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";

const ROLE_LABEL: Record<MembershipSummaryDto["role"], string> = {
  organizer: "Organizador",
  staff: "Staff",
  captain: "Capitán",
  player: "Jugador",
};

export function OrganizationPicker() {
  const membershipsQuery = useMyMembershipsQuery();
  const memberships = membershipsQuery.data?.memberships;

  if (membershipsQuery.isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar tus organizaciones.</p>;
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
