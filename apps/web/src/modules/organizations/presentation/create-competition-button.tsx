"use client";

import { Link } from "@tanstack/react-router";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function CreateCompetitionButton({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  return (
    <Button render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions/new" />}>
      <PlusIcon aria-hidden="true" />
      {t("org.home.createCompetition")}
    </Button>
  );
}
