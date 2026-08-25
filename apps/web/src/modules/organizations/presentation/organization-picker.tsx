"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors } from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import type { MembershipSummaryDto } from "@futrob/api-contracts";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";

const ROLE_LABEL = {
  organizer: "Organizador",
  staff: "Staff",
  member: "Miembro",
} satisfies Record<MembershipSummaryDto["role"], string>;

const styles = stylex.create({
  error: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.destructive,
  },
  muted: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  link: {
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
  list: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
  item: {
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  row: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
    paddingBlock: "1rem",
    transitionProperty: "background-color, color, border-color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    color: {
      default: null,
      ":hover": colors.primary,
    },
  },
  name: {
    fontWeight: 500,
  },
  role: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
});

const link = applyStyles(styles.link);
const row = applyStyles(styles.row);

export function OrganizationPicker() {
  const membershipsQuery = useMyMembershipsQuery();
  const memberships = membershipsQuery.data?.memberships;

  if (membershipsQuery.isError) {
    return <p {...applyStyles(styles.error)}>No se pudieron cargar tus organizaciones.</p>;
  }

  if (memberships == null) {
    return <p {...applyStyles(styles.muted)}>Cargando organizaciones…</p>;
  }

  if (memberships.length === 0) {
    return (
      <p {...applyStyles(styles.muted)}>
        Aún no perteneces a ninguna organización. Puedes{" "}
        <Link className={link.className} style={link.style} to="/orgs/new">
          crear una
        </Link>{" "}
        o{" "}
        <Link className={link.className} style={link.style} to="/invitations/accept">
          aceptar una invitación
        </Link>
        .
      </p>
    );
  }

  return (
    <ul {...applyStyles(styles.list)}>
      {memberships.map((membership) => (
        <li key={membership.organizationId} {...applyStyles(styles.item)}>
          <Link
            className={row.className}
            params={{ orgId: membership.organizationId }}
            style={row.style}
            to="/orgs/$orgId"
          >
            <span {...applyStyles(styles.name)}>{membership.organizationName}</span>
            <span {...applyStyles(styles.role)}>{ROLE_LABEL[membership.role]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
