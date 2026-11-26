import { useId, useRef, type ReactNode } from "react";
import {
  applyStyles,
  Body,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
  useExternalSync,
  vis,
} from "@futrob/ui";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./organization-plan.styles.ts";

const USAGE_LABELS = [
  "billing.usage.activeCompetitions",
  "billing.usage.staffMembers",
  "billing.usage.providerSyncJobs",
] as const satisfies readonly MessageKey[];

const FEATURE_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
const CHANGE_ROWS = [0, 1, 2];

function SkeletonCard({
  children,
  description,
  headingId,
  title,
  wide = false,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly headingId: string;
  readonly title: string;
  readonly wide?: boolean;
}) {
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel, wide && styles.wide)}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={headingId}>
          {title}
        </Heading>
        {description ? <Caption>{description}</Caption> : null}
      </CardHeader>
      <CardContent className={styles.content}>{children}</CardContent>
    </Card>
  );
}

/**
 * Polite loading announcement kept outside the busy skeleton so assistive
 * technology can hear it, then cleared when the plan state settles.
 */
export function OrganizationPlanLoadingStatus({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const label = t("billing.loading");
  const node = useRef<HTMLSpanElement>(null);
  useExternalSync(() => {
    const el = node.current;
    if (!el) return undefined;
    el.textContent = active ? label : "";
    return () => {
      el.textContent = "";
    };
  }, [active, label]);
  return (
    <span
      ref={node}
      aria-label={active ? label : undefined}
      aria-live="polite"
      role="status"
      {...applyStyles(vis.srOnly)}
    />
  );
}

/**
 * Layout-matched bones for Plan y uso. Card titles stay real so the grid does not
 * jump when the plan read resolves.
 */
export function OrganizationPlanSkeleton() {
  const { t } = useI18n();
  const usageHeadingId = useId();
  const summaryHeadingId = useId();
  const featuresHeadingId = useId();
  const changesHeadingId = useId();

  return (
    <div aria-busy="true" {...applyStyles(styles.grid)}>
      <SkeletonCard
        description={t("billing.usage.description")}
        headingId={usageHeadingId}
        title={t("billing.usage.title")}
      >
        <ul {...applyStyles(styles.usageList)}>
          {USAGE_LABELS.map((key) => (
            <li key={key} {...applyStyles(styles.usageItem)}>
              <div {...applyStyles(styles.usageLine)}>
                <Body as="span">{t(key)}</Body>
                <Skeleton {...applyStyles(styles.boneValue)} />
              </div>
              <Skeleton {...applyStyles(styles.boneTrack)} />
              {key === "billing.usage.providerSyncJobs" ? (
                <Skeleton {...applyStyles(styles.boneCaption)} />
              ) : null}
            </li>
          ))}
        </ul>
      </SkeletonCard>

      <SkeletonCard headingId={summaryHeadingId} title={t("billing.plan.current")}>
        <div {...applyStyles(styles.planLine)}>
          <Skeleton {...applyStyles(styles.bonePlanName)} />
          <Skeleton {...applyStyles(styles.boneBadge)} />
        </div>
        <div {...applyStyles(styles.actions)}>
          <Skeleton {...applyStyles(styles.boneAction)} />
          <Skeleton {...applyStyles(styles.boneAction)} />
        </div>
        <Skeleton {...applyStyles(styles.boneHint)} />
      </SkeletonCard>

      <SkeletonCard headingId={featuresHeadingId} title={t("billing.features.title")}>
        <ul aria-hidden="true" {...applyStyles(styles.featureList)}>
          {FEATURE_ROWS.map((index) => (
            <li key={index} {...applyStyles(styles.feature)}>
              <Skeleton {...applyStyles(styles.boneFeatureIcon)} />
              <Skeleton {...applyStyles(styles.boneFeatureLabel)} />
            </li>
          ))}
        </ul>
      </SkeletonCard>

      <SkeletonCard headingId={changesHeadingId} title={t("billing.changes.title")} wide>
        <div aria-hidden="true" {...applyStyles(styles.skeletonTable)}>
          <Table containerTabIndex={-1} dense>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("billing.changes.change")}</TableHead>
                <TableHead scope="col">{t("billing.changes.reason")}</TableHead>
                <TableHead scope="col">{t("billing.changes.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CHANGE_ROWS.map((index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.boneChangeWide)} />
                  </TableCell>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.boneChangeCell)} />
                  </TableCell>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.boneChangeCell)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SkeletonCard>
    </div>
  );
}
