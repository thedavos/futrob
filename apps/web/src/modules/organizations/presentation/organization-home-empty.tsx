"use client";

import { useId } from "react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import * as stylex from "@stylexjs/stylex";
import createCompetitionUrl from "@/assets/illustration-create-competition.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CreateCompetitionButton } from "./create-competition-button.tsx";

const styles = stylex.create({
  error: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
});

export function OrganizationHomeEmpty({
  canCreate,
  organizationId,
}: {
  readonly canCreate: boolean;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <EmptyState aria-labelledby={titleId}>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={createCompetitionUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>{t("org.home.empty.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("org.home.empty.description")}</EmptyStateDescription>
      </EmptyStateCopy>
      {canCreate ? (
        <EmptyStateActions>
          <CreateCompetitionButton organizationId={organizationId} />
        </EmptyStateActions>
      ) : null}
    </EmptyState>
  );
}

export function OrganizationHomeLoadError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.error)}>
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button onClick={onRetry} type="button" variant="outline">
        {t("common.retry")}
      </Button>
    </div>
  );
}
