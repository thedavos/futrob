"use client";

import { useRef } from "react";
import { applyStyles, Skeleton, useExternalSync, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./organization-competitions-page.styles.ts";

export const ORGANIZATION_COMPETITIONS_SKELETON_ROWS = 5;

const ROWS = Array.from({ length: ORGANIZATION_COMPETITIONS_SKELETON_ROWS }, (_, index) => index);

/**
 * Polite loading announcement kept outside the busy results container so
 * assistive technology can hear it, then cleared when the query settles.
 */
export function OrganizationCompetitionsLoadingStatus({ active }: { readonly active: boolean }) {
  const { t } = useI18n();
  const label = t("org.competitions.loading");
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
 * Loading bones for the organization competitions index. Mirrors the data-state
 * list so the page does not jump when the first read resolves.
 */
export function OrganizationCompetitionsSkeleton() {
  return (
    <ul aria-hidden="true" {...applyStyles(styles.list)}>
      {ROWS.map((index) => (
        <li key={index} {...applyStyles(styles.item)}>
          <div {...applyStyles(styles.row)}>
            <span {...applyStyles(styles.copy)}>
              <span {...applyStyles(styles.nameLine)}>
                <Skeleton {...applyStyles(styles.nameBone)} />
              </span>
              <span {...applyStyles(styles.metaLine)}>
                <Skeleton {...applyStyles(styles.metaBone)} />
              </span>
            </span>
            <Skeleton {...applyStyles(styles.badgeBone)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
