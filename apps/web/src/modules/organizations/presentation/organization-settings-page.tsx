"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  TextLink,
  vis,
} from "@futrob/ui";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { OrganizationSettingsForm } from "./organization-settings-form.tsx";
import { useOrganizationProfileQuery } from "./organization-queries.ts";
import { OrganizationSettingsFormSkeleton } from "./organization-settings-skeleton.tsx";

const styles = stylex.create({
  main: {
    width: "100%",
    maxWidth: "36rem",
    marginInline: "auto",
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
});

export function OrganizationSettingsPage({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  const profileQuery = useOrganizationProfileQuery(organizationId);
  const audit = useCan({ organizationId }, ORGANIZATION_PERMISSION.auditTrailRead);
  const update = useCan({ organizationId }, ORGANIZATION_PERMISSION.update);
  const readOnly = !update.loading && !update.allowed;
  const loading = profileQuery.isPending;
  const loadingLabel = t("organizations.settings.loading");

  return (
    <main
      aria-busy={loading || undefined}
      aria-label={loading ? loadingLabel : undefined}
      {...applyStyles(styles.main)}
    >
      {loading ? (
        <span aria-label={loadingLabel} role="status" {...applyStyles(vis.srOnly)}>
          {loadingLabel}
        </span>
      ) : null}
      <PageHeader>
        <PageHeaderTitle>{t("organizations.settings.title")}</PageHeaderTitle>
        <PageHeaderDescription>{t("organizations.settings.description")}</PageHeaderDescription>
      </PageHeader>

      <div {...applyStyles(styles.body)}>
        {audit.allowed ? (
          <TextLink href={`/orgs/${encodeURIComponent(organizationId)}/settings/audit`}>
            {t("audit.title")}
          </TextLink>
        ) : null}
        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("organizations.settings.loadFailed")}</AlertDescription>
            <Button onClick={() => void profileQuery.refetch()} type="button" variant="outline">
              {t("common.retry")}
            </Button>
          </Alert>
        ) : null}

        {loading ? <OrganizationSettingsFormSkeleton showSubmit={!readOnly} /> : null}

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
