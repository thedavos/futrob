"use client";

import { applyStyles, Skeleton, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./organization-competitions-page.styles.ts";

export const ORGANIZATION_COMPETITIONS_SKELETON_ROWS = 5;

const ROWS = Array.from({ length: ORGANIZATION_COMPETITIONS_SKELETON_ROWS }, (_, index) => index);

/**
 * Loading bones for the organization competitions index. Mirrors the data-state
 * list so the page does not jump when the first read resolves.
 */
export function OrganizationCompetitionsSkeleton() {
  const { t } = useI18n();
  const label = t("org.competitions.loading");

  return (
    <div aria-busy="true" aria-label={label}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <ul aria-hidden="true" {...applyStyles(styles.list)}>
        {ROWS.map((index) => (
          <li key={index} {...applyStyles(styles.item)}>
            <div {...applyStyles(styles.row)}>
              <span {...applyStyles(styles.copy)}>
                <Skeleton {...applyStyles(styles.nameBone)} />
                <Skeleton {...applyStyles(styles.metaBone)} />
              </span>
              <Skeleton {...applyStyles(styles.badgeBone)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
