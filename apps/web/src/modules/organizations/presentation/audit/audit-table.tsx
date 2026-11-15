import type { OrganizationAuditEntryDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Text,
  TextLink,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { auditActionLabel } from "./audit-labels.ts";
import { styles } from "./audit.styles.ts";

export function AuditTable({
  entries,
}: {
  readonly entries: readonly OrganizationAuditEntryDto[];
}) {
  const { t, locale } = useI18n();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <Table aria-label={t("audit.table.label")} className={styles.table} dense>
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
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <time dateTime={entry.occurredAt}>{date.format(new Date(entry.occurredAt))}</time>
            </TableCell>
            <TableCell>
              <div {...applyStyles(styles.stack)}>
                <Text tone="default">
                  {entry.actorName ?? entry.actorId ?? t("audit.systemActor")}
                </Text>
                {entry.actorName && entry.actorId ? <Caption>{entry.actorId}</Caption> : null}
              </div>
            </TableCell>
            <TableCell>
              <Text tone="default" className={styles.text}>
                {auditActionLabel(entry.action, t)}
              </Text>
            </TableCell>
            <TableCell>
              <Text tone="default" className={styles.text}>
                {entry.reason ?? t("audit.noReason")}
              </Text>
            </TableCell>
            <TableCell>
              <div {...applyStyles(styles.stack)}>
                {entry.object.href ? (
                  <TextLink href={entry.object.href}>
                    {entry.object.label ?? entry.object.id}
                  </TextLink>
                ) : (
                  <Text tone="default">{entry.object.label ?? entry.object.id}</Text>
                )}
                {entry.requestId ? (
                  <Caption>{t("audit.correlation", { id: entry.requestId })}</Caption>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
