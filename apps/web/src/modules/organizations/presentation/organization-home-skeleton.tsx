"use client";

import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
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
  vis,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { ActivityFeedSkeleton } from "@/modules/notifications/presentation/activity-feed-list.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ORGANIZATION_HOME_LIST_LIMIT } from "./organization-home-model.ts";
import { organizationHomeLayout as layout } from "./organization-home.styles.ts";

const COMPETITION_ROWS = Array.from({ length: ORGANIZATION_HOME_LIST_LIMIT }, (_, index) => index);

const bones = stylex.create({
  viewAll: {
    width: "4.75rem",
    height: "1rem",
    flexShrink: 0,
  },
  cover: {
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
  },
  name: {
    width: "11rem",
    maxWidth: "100%",
    height: "1rem",
  },
  subtitle: {
    width: "8rem",
    maxWidth: "80%",
    height: "0.75rem",
  },
  badge: {
    width: "6.5rem",
    maxWidth: "100%",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
  },
  count: {
    display: "inline-block",
    width: "1.5rem",
    height: "1rem",
  },
  start: {
    width: "5.5rem",
    maxWidth: "100%",
    height: "1rem",
  },
  actions: {
    width: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    flexShrink: 0,
    marginInline: "auto",
  },
});

/**
 * Loading layout for organization home competitions + recent activity. Mirrors the
 * data-state stack so those sections do not jump in when the first list resolves.
 */
export function OrganizationHomeSectionsSkeleton() {
  const { t } = useI18n();
  const titleId = useId();
  const label = t("org.home.competitions.loading");
  const bodyCell = applyStyles(layout.bodyCell);
  const actionsCell = applyStyles(layout.bodyCell, layout.alignCenter);

  return (
    <div aria-busy="true" aria-label={label} {...applyStyles(layout.stack)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <Card className={layout.card}>
        <CardHeader className={layout.header}>
          <Heading className={typography.title} id={titleId}>
            {t("org.home.competitions")}
          </Heading>
          <Skeleton aria-hidden="true" tabIndex={-1} {...applyStyles(bones.viewAll)} />
        </CardHeader>
        <CardContent className={layout.tableContent}>
          <Table containerLabelledBy={titleId} containerTabIndex={-1}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("org.home.table.name")}</TableHead>
                <TableHead>{t("org.home.table.status")}</TableHead>
                <TableHead>{t("org.home.table.teams")}</TableHead>
                <TableHead>{t("org.home.table.start")}</TableHead>
                <TableHead align="center">{t("org.home.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPETITION_ROWS.map((index) => (
                <TableRow key={index}>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <div aria-hidden="true" {...applyStyles(layout.identity)}>
                      <Skeleton {...applyStyles(layout.cover, bones.cover)} />
                      <span {...applyStyles(layout.copy)}>
                        <Skeleton {...applyStyles(bones.name)} />
                        <Skeleton {...applyStyles(bones.subtitle)} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <Skeleton {...applyStyles(bones.badge)} />
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <Skeleton {...applyStyles(bones.count)} />
                  </TableCell>
                  <TableCell className={bodyCell.className} style={bodyCell.style}>
                    <Skeleton {...applyStyles(bones.start)} />
                  </TableCell>
                  <TableCell
                    className={actionsCell.className}
                    style={{ ...actionsCell.style, textAlign: "center" }}
                  >
                    <Skeleton tabIndex={-1} {...applyStyles(bones.actions)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className={layout.card}>
        <CardHeader className={layout.header}>
          <Heading className={typography.title}>{t("activity.recent.title")}</Heading>
        </CardHeader>
        <CardContent className={layout.activityContent}>
          <ActivityFeedSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
