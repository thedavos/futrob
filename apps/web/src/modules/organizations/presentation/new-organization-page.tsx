"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CreateOrganizationProfileForm } from "./create-organization-profile-form.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
});

export function NewOrganizationPage() {
  const { t } = useI18n();

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("organizations.create.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("organizations.create.description")}</PageHeaderDescription>
      </PageHeader>
      <CreateOrganizationProfileForm />
    </main>
  );
}
