"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Caption,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link, Navigate } from "@tanstack/react-router";
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
});

export function OrgsIndexPage() {
  const membershipsQuery = useMyMembershipsQuery();
  const memberships = membershipsQuery.data?.memberships;

  if (memberships?.length === 0) {
    return <Navigate to="/onboarding" />;
  }
  if (memberships?.length === 1) {
    return <Navigate params={{ orgId: memberships[0]!.organizationId }} to="/orgs/$orgId" />;
  }

  const showPicker = membershipsQuery.isError || (memberships != null && memberships.length > 1);

  if (!showPicker) {
    return (
      <main {...applyStyles(styles.loading)}>
        <Caption>Cargando organizaciones…</Caption>
      </main>
    );
  }

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Tus organizaciones</PageHeaderTitle>
        <PageHeaderDescription>
          Elige con cuál quieres continuar.{" "}
          <TextLink render={<Link to="/invitations/accept" />}>Unirme a otra</TextLink>
        </PageHeaderDescription>
      </PageHeader>
      <OrganizationPicker />
    </main>
  );
}
