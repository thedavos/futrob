import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import emptyFixturesUrl from "@/assets/illustration-pending-fixtures.png";
import notFoundUrl from "@/assets/illustration-sports-venue.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./public-portal.styles.ts";

/** A section with nothing to show yet. Spectators have no next action, so there is no CTA. */
export function PortalEmpty({
  description,
  illustration = emptyFixturesUrl,
  title,
}: {
  readonly description: string;
  readonly illustration?: string;
  readonly title: string;
}) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={illustration} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{title}</EmptyStateTitle>
        <EmptyStateDescription>{description}</EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
  );
}

/** A read failed (not a 404). Retrying reruns the route loaders. */
export function PortalError({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState>
      <EmptyStateCopy>
        <EmptyStateTitle>{t("portal.error.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("portal.error.description")}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button onClick={onRetry} variant="outline">
          {t("portal.error.retry")}
        </Button>
      </EmptyStateActions>
    </EmptyState>
  );
}

/**
 * Unknown, unpublished and another organization's competitions read the same, so the page never
 * reveals whether a competition exists.
 */
export function PortalNotFound() {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.page, styles.container, styles.main)}>
      <EmptyState fill>
        <EmptyStateIcon>
          <img alt="" data-outline="none" src={notFoundUrl} />
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle>{t("portal.notFound.title")}</EmptyStateTitle>
          <EmptyStateDescription>{t("portal.notFound.description")}</EmptyStateDescription>
        </EmptyStateCopy>
        <EmptyStateActions>
          <Button render={<Link to="/" />} role="link" variant="outline">
            {t("portal.notFound.action")}
          </Button>
        </EmptyStateActions>
      </EmptyState>
    </main>
  );
}

export function PortalLoading() {
  const { t } = useI18n();
  return (
    <div
      aria-busy="true"
      aria-label={t("portal.loading")}
      role="status"
      {...applyStyles(styles.section)}
    >
      <Skeleton {...applyStyles(styles.skeleton)} />
      <Skeleton {...applyStyles(styles.skeleton)} />
      <Skeleton {...applyStyles(styles.skeleton)} />
    </div>
  );
}
