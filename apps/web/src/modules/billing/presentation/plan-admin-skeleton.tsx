import { useId } from "react";
import {
  applyStyles,
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
  vis,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./plan-admin.styles.ts";

const PLAN_PILLS = [0, 1, 2] as const;
const QUEUE_ROWS = [0, 1, 2] as const;

/**
 * Layout-matching bones for the plan queue and assignment form, used while
 * permissions resolve and while the queue is still loading.
 */
export function PlanAdminSkeleton({ label }: { readonly label: string }) {
  return (
    <>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <AssignPlanSkeleton />
      <RequestQueueSkeleton />
    </>
  );
}

function AssignPlanSkeleton() {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={headingId}>
          {t("billing.admin.form.title")}
        </Heading>
        <Caption>{t("billing.admin.form.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        <div aria-hidden="true" {...applyStyles(styles.form)}>
          <FieldBone />
          <div {...applyStyles(styles.choices)}>
            <Skeleton {...applyStyles(styles.legendBone)} />
            <div {...applyStyles(styles.pills)}>
              {PLAN_PILLS.map((index) => (
                <Skeleton key={index} {...applyStyles(styles.pillBone)} />
              ))}
            </div>
          </div>
          <div {...applyStyles(styles.fieldBone)}>
            <Skeleton {...applyStyles(styles.labelBone)} />
            <Skeleton {...applyStyles(styles.inputBone)} />
            <Skeleton {...applyStyles(styles.hintBone)} />
          </div>
          <div {...applyStyles(styles.actions)}>
            <Skeleton {...applyStyles(styles.submitBone)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldBone() {
  return (
    <div {...applyStyles(styles.fieldBone)}>
      <Skeleton {...applyStyles(styles.labelBone)} />
      <Skeleton {...applyStyles(styles.inputBone)} />
    </div>
  );
}

function RequestQueueSkeleton() {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={headingId}>
          {t("billing.admin.queue.title")}
        </Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        <Table containerTabIndex={-1} dense>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("billing.admin.queue.organization")}</TableHead>
              <TableHead scope="col">{t("billing.admin.queue.plan")}</TableHead>
              <TableHead scope="col">{t("billing.admin.queue.date")}</TableHead>
              <TableHead scope="col">{t("billing.admin.queue.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {QUEUE_ROWS.map((index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton {...applyStyles(styles.orgBone)} />
                </TableCell>
                <TableCell>
                  <Skeleton {...applyStyles(styles.planBone)} />
                </TableCell>
                <TableCell>
                  <Skeleton {...applyStyles(styles.dateBone)} />
                </TableCell>
                <TableCell>
                  <Skeleton {...applyStyles(styles.actionBone)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
