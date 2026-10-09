"use client";

import type { ActivityEntryDto } from "@futrob/api-contracts";
import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Skeleton } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  activityRowView,
  formatActivityTime,
  type ActivityRowView,
  type ActivityTone,
} from "./activity-view.ts";

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  item: {
    minWidth: 0,
  },
  row: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
    paddingBlock: "0.5rem",
    color: colors.foreground,
    textDecorationLine: "none",
    borderRadius: "var(--corner-md)",
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  icon: {
    display: "flex",
    flexShrink: 0,
    width: "1rem",
    height: "1rem",
  },
  toneDefault: { color: colors.foreground },
  // Disputes are the only urgent rows; the palette gives disputes the danger colour.
  toneUrgent: { color: colors.danger },
  toneWaiting: { color: colors.mutedForeground },
  toneResolved: { color: colors.mutedForeground },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  title: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  time: {
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  skeletonRow: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    gap: "0.75rem",
  },
  skeletonIcon: { width: "1rem", height: "1rem", flexShrink: 0 },
  skeletonCopy: { display: "flex", flexGrow: 1, flexDirection: "column", gap: "0.375rem" },
  skeletonTitle: { width: "55%", height: "0.75rem" },
  skeletonSubtitle: { width: "35%", height: "0.625rem" },
});

function toneStyle(tone: ActivityTone) {
  switch (tone) {
    case "default":
      return styles.toneDefault;
    case "urgent":
      return styles.toneUrgent;
    case "waiting":
      return styles.toneWaiting;
    case "resolved":
      return styles.toneResolved;
  }
}

function RowContent({ view, now }: { readonly view: ActivityRowView; readonly now: Date }) {
  const { locale, t } = useI18n();
  const IconComponent = view.icon;
  return (
    <>
      <IconComponent aria-hidden {...applyStyles(styles.icon, toneStyle(view.tone))} />
      <span {...applyStyles(styles.copy)}>
        <span {...applyStyles(styles.title)}>{t(view.titleKey)}</span>
        {view.subtitle ? (
          <Caption as="span" truncate>
            {view.subtitle}
          </Caption>
        ) : null}
      </span>
      <Caption as="span" className={styles.time}>
        <time dateTime={view.at.toISOString()}>{formatActivityTime(view.at, locale, now)}</time>
      </Caption>
    </>
  );
}

/** Activity rows of every kind, newest first, each one leading to the resource it names. */
export function ActivityFeedList({
  activities,
  label,
  now = new Date(),
}: {
  readonly activities: readonly ActivityEntryDto[];
  /** Accessible name of the list, usually the heading of its section. */
  readonly label: string;
  readonly now?: Date;
}) {
  return (
    <ul aria-label={label} {...applyStyles(styles.list)}>
      {activities.map((activity) => {
        const view = activityRowView(activity, now);
        const destination = view.destination;
        return (
          <li key={view.id} {...applyStyles(styles.item)}>
            {destination ? (
              <Link {...destination} {...applyStyles(styles.row)}>
                <RowContent now={now} view={view} />
              </Link>
            ) : (
              <div {...applyStyles(styles.row)}>
                <RowContent now={now} view={view} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityFeedSkeleton({ rows = 4 }: { readonly rows?: number }) {
  return (
    <div aria-hidden {...applyStyles(styles.list)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} {...applyStyles(styles.skeletonRow)}>
          <Skeleton {...applyStyles(styles.skeletonIcon)} />
          <div {...applyStyles(styles.skeletonCopy)}>
            <Skeleton {...applyStyles(styles.skeletonTitle)} />
            <Skeleton {...applyStyles(styles.skeletonSubtitle)} />
          </div>
        </div>
      ))}
    </div>
  );
}
