"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { OrganizationSettingsForm } from "./organization-settings-form.tsx";
import { useOrganizationProfileQuery } from "./organization-queries.ts";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  status: {
    color: colors.mutedForeground,
  },
});

export function OrganizationSettingsPage({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  const profileQuery = useOrganizationProfileQuery(organizationId);
  const update = useCan({ organizationId }, ORGANIZATION_PERMISSION.update);
  const readOnly = !update.loading && !update.allowed;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("organizations.settings.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("organizations.settings.description")}</PageHeaderDescription>
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("organizations.settings.loadFailed")}</AlertDescription>
            <Button onClick={() => void profileQuery.refetch()} type="button" variant="outline">
              {t("common.retry")}
            </Button>
          </Alert>
        ) : null}

        {profileQuery.isPending ? (
          <Caption {...applyStyles(styles.status)}>{t("organizations.settings.loading")}</Caption>
        ) : null}

        {readOnly ? (
          <Alert variant="info">
            <AlertDescription>{t("organizations.settings.readOnly")}</AlertDescription>
          </Alert>
        ) : null}

        {profileQuery.data ? (
          <OrganizationSettingsForm
            canEdit={update.allowed}
            key={profileQuery.data.organizationId}
            profile={profileQuery.data}
          />
        ) : null}
      </div>
    </main>
  );
}
