import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  Heading,
  Skeleton,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { MembersSectionState } from "./organization-members-model.ts";
import { styles } from "./organization-members-sections.styles.ts";

export function MembersEmptyState({
  title,
  description,
  icon,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <div {...applyStyles(styles.placeholder)}>
      <EmptyState>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <EmptyStateCopy>
          <Heading as="h3" className={styles.emptyTitle}>
            {title}
          </Heading>
          <EmptyStateDescription className={styles.emptyCopy}>{description}</EmptyStateDescription>
        </EmptyStateCopy>
        {action ? <EmptyStateActions>{action}</EmptyStateActions> : null}
      </EmptyState>
    </div>
  );
}

export function MembersSectionFeedback({
  state,
  area,
}: {
  readonly state: Exclude<MembersSectionState<never>, { kind: "data" }>;
  readonly area: "list" | "changes";
}) {
  const { t } = useI18n();
  switch (state.kind) {
    case "loading":
      return (
        <div role="status" {...applyStyles(styles.skeletons)}>
          <Caption>{t(`organizations.members.${area}.loading`)}</Caption>
          <Skeleton {...applyStyles(styles.skeletonLabel)} aria-hidden="true" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} aria-hidden="true" {...applyStyles(styles.skeletonRow)}>
              <Skeleton {...applyStyles(styles.skeletonLine)} />
              <Skeleton {...applyStyles(styles.skeletonLine)} />
              <Skeleton {...applyStyles(styles.skeletonLine)} />
            </div>
          ))}
        </div>
      );
    case "error":
      return (
        <div {...applyStyles(styles.placeholder)}>
          <div {...applyStyles(styles.feedback)}>
            <Alert variant="destructive">
              <AlertDescription>{t(`organizations.members.${area}.error`)}</AlertDescription>
            </Alert>
            <Button onClick={state.retry} type="button" variant="outline">
              {t("common.retry")}
            </Button>
          </div>
        </div>
      );
    case "denied":
      return (
        <MembersEmptyState
          title={t("organizations.members.deniedTitle")}
          description={t(`organizations.members.${area}.denied`)}
        />
      );
    case "unavailable":
      return (
        <MembersEmptyState
          title={t(`organizations.members.${area}.unavailableTitle`)}
          description={t(`organizations.members.${area}.unavailable`)}
        />
      );
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function MembersRefreshNotice<T>({
  state,
}: {
  readonly state: Extract<MembersSectionState<T>, { kind: "data" }>;
}) {
  const { t } = useI18n();
  if (state.refresh.kind === "pending")
    return <Caption role="status">{t("organizations.members.refreshing")}</Caption>;
  if (state.refresh.kind !== "error") return null;
  return (
    <Alert variant="warning">
      <AlertDescription>{t("organizations.members.refreshFailed")}</AlertDescription>
      <Button onClick={state.refresh.retry} type="button" variant="outline">
        {t("common.retry")}
      </Button>
    </Alert>
  );
}
