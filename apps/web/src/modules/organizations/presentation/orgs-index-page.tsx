"use client";

import { useEffect } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link, useNavigate } from "@tanstack/react-router";
import { OrganizationPicker } from "@/modules/organizations/presentation/organization-picker.tsx";
import { useMyMembershipsQuery } from "@/modules/organizations/presentation/organization-queries.ts";

const styles = stylex.create({
  loading: {
    display: "flex",
    minHeight: "100svh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingInline: "1.25rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  main: {
    width: "100%",
  },
  header: {
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  copy: {
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
});

const link = applyStyles(styles.link);

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
    return <main {...applyStyles(styles.loading)}>Cargando organizaciones…</main>;
  }

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.header)}>
        <h1 {...applyStyles(typography.heading)}>Tus organizaciones</h1>
        <p {...applyStyles(styles.copy)}>
          Elige con cuál quieres continuar.{" "}
          <Link className={link.className} style={link.style} to="/invitations/accept">
            Unirme a otra
          </Link>
        </p>
      </div>
      <OrganizationPicker />
    </main>
  );
}
