"use client";

import {
  applyStyles,
  Caption,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./audit.styles.ts";

const ROWS = [0, 1, 2, 3, 4, 5] as const;

export function AuditLoadingSkeleton() {
  const { t } = useI18n();
  const label = t("audit.loading");
  return (
    <div aria-busy="true" aria-label={label}>
      <div {...applyStyles(styles.body)}>
        <div aria-hidden="true">
          <Table className={styles.table} containerTabIndex={-1} dense>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.column.date")}</TableHead>
                <TableHead>{t("audit.column.actor")}</TableHead>
                <TableHead>{t("audit.column.action")}</TableHead>
                <TableHead>{t("audit.column.reason")}</TableHead>
                <TableHead>{t("audit.column.object")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.skeletonDate)} />
                  </TableCell>
                  <TableCell>
                    <div {...applyStyles(styles.stack)}>
                      <Skeleton {...applyStyles(styles.skeletonActor)} />
                      <Skeleton {...applyStyles(styles.skeletonActorId)} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.skeletonAction)} />
                  </TableCell>
                  <TableCell>
                    <Skeleton {...applyStyles(styles.skeletonReason)} />
                  </TableCell>
                  <TableCell>
                    <div {...applyStyles(styles.stack)}>
                      <Skeleton {...applyStyles(styles.skeletonObject)} />
                      <Skeleton {...applyStyles(styles.skeletonRequest)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div aria-hidden="true" {...applyStyles(styles.pagination)}>
          <Caption>{t("audit.order")}</Caption>
          <div {...applyStyles(styles.paginationActions)}>
            <Skeleton {...applyStyles(styles.skeletonPageButton)} />
            <Skeleton {...applyStyles(styles.skeletonPageButton)} />
          </div>
        </div>
      </div>
    </div>
  );
}
