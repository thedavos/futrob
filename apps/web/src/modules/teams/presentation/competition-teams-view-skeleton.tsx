"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles as detailStyles } from "./competition-teams-view-detail.styles.ts";
import { styles as listStyles } from "./competition-teams-view-list.styles.ts";

const bones = stylex.create({
  search: {
    width: "100%",
    height: "2.25rem",
  },
  pill: {
    height: "2.25rem",
    borderRadius: "var(--corner-full)",
    flexShrink: 0,
  },
  pillAll: { width: "5.5rem" },
  pillPending: { width: "7.25rem" },
  pillNoClub: { width: "6.5rem" },
  item: {
    display: "flex",
    width: "100%",
    minHeight: "4.25rem",
    paddingBlock: "0.75rem",
    paddingLeft: "1rem",
    paddingRight: "0.875rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border-subtle) 65%, transparent)",
  },
  name: {
    width: "9rem",
    maxWidth: "100%",
    height: "1rem",
  },
  meta: {
    width: "7.5rem",
    maxWidth: "80%",
    height: "0.75rem",
  },
  badge: {
    width: "5.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
});

const LIST_SKELETON_ROWS = [0, 1, 2, 3, 4, 5] as const;
const ROSTER_SKELETON_ROWS = [0, 1, 2, 3] as const;
const STAT_SKELETON_CELLS = [0, 1, 2] as const;
const skeletonTableCell = applyStyles(detailStyles.skeletonTableCell);

export function TeamListSkeleton() {
  const lastIndex = LIST_SKELETON_ROWS.length - 1;
  return (
    <div aria-busy="true">
      <div aria-hidden="true" {...applyStyles(listStyles.toolbar)}>
        <Skeleton {...applyStyles(bones.search)} />
        <div {...applyStyles(listStyles.pills)}>
          <Skeleton {...applyStyles(bones.pill, bones.pillAll)} />
          <Skeleton {...applyStyles(bones.pill, bones.pillPending)} />
          <Skeleton {...applyStyles(bones.pill, bones.pillNoClub)} />
        </div>
      </div>
      <div aria-hidden="true" {...applyStyles(listStyles.nav)}>
        {LIST_SKELETON_ROWS.map((index) => (
          <div
            data-slot="team-list-skeleton-item"
            key={index}
            {...applyStyles(bones.item, index === lastIndex && listStyles.itemLast)}
          >
            <span {...applyStyles(listStyles.row)}>
              <span {...applyStyles(listStyles.copy)}>
                <Skeleton {...applyStyles(bones.name)} />
                <Skeleton {...applyStyles(bones.meta)} />
              </span>
              <Skeleton {...applyStyles(bones.badge)} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamDetailSkeleton({ busy = true }: { readonly busy?: boolean } = {}) {
  const { t } = useI18n();
  return (
    <div aria-busy={busy || undefined}>
      <div {...applyStyles(detailStyles.body)}>
        <div {...applyStyles(detailStyles.header)}>
          <div {...applyStyles(detailStyles.identity)}>
            <Skeleton {...applyStyles(detailStyles.skeletonBack)} />
            <div {...applyStyles(detailStyles.titleBlock)}>
              <div {...applyStyles(detailStyles.titleRow)}>
                <Skeleton {...applyStyles(detailStyles.skeletonTitle)} />
                <Skeleton {...applyStyles(detailStyles.skeletonBadge)} />
              </div>
              <Skeleton {...applyStyles(detailStyles.skeletonClub)} />
            </div>
          </div>
        </div>

        <div aria-hidden="true" {...applyStyles(detailStyles.statsStrip)}>
          {STAT_SKELETON_CELLS.map((index) => (
            <div key={index} {...applyStyles(detailStyles.statCell)}>
              <Skeleton {...applyStyles(detailStyles.skeletonStatIcon)} />
              <div {...applyStyles(detailStyles.statStack)}>
                <Skeleton {...applyStyles(detailStyles.skeletonStatLabel)} />
                <Skeleton {...applyStyles(detailStyles.skeletonStatValue)} />
                <Skeleton {...applyStyles(detailStyles.skeletonStatHint)} />
              </div>
            </div>
          ))}
        </div>

        <section {...applyStyles(detailStyles.roster)}>
          <div {...applyStyles(detailStyles.rosterHeader)}>
            <Skeleton {...applyStyles(detailStyles.skeletonRosterHeading)} />
          </div>
          <Table containerTabIndex={-1} dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t("competition.teams.detail.column.player")}</TableHead>
                <TableHead>{t("competition.teams.detail.column.account")}</TableHead>
                <TableHead>{t("competition.teams.detail.column.role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROSTER_SKELETON_ROWS.map((index) => (
                <TableRow key={index}>
                  <TableCell
                    className={skeletonTableCell.className}
                    style={skeletonTableCell.style}
                  >
                    <Skeleton {...applyStyles(detailStyles.skeletonPlayer)} />
                  </TableCell>
                  <TableCell
                    className={skeletonTableCell.className}
                    style={skeletonTableCell.style}
                  >
                    <Skeleton {...applyStyles(detailStyles.skeletonAccount)} />
                  </TableCell>
                  <TableCell
                    className={skeletonTableCell.className}
                    style={skeletonTableCell.style}
                  >
                    <Skeleton {...applyStyles(detailStyles.skeletonRole)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
