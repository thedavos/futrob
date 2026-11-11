"use client";

import type { ReactNode } from "react";
import type { CompetitionSanctionDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Caption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  sanctionDetail,
  sanctionPlayerName,
  sanctionTeamName,
  sanctionTypeLabel,
} from "./sanction-view.ts";
import { styles } from "./sanctions.styles.ts";

/**
 * Sanctions with their audit trail. Revoked rows stay listed with who withdrew them and
 * why; `action` renders the operator's revoke control, absent on read-only views.
 */
export function SanctionTable({
  action,
  label,
  sanctions,
}: {
  readonly action?: (sanction: CompetitionSanctionDto) => ReactNode;
  readonly label: string;
  readonly sanctions: readonly CompetitionSanctionDto[];
}) {
  const { locale, t } = useI18n();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <Table aria-label={label} className={styles.table} dense>
      <TableHeader>
        <TableRow>
          <TableHead>{t("sanctions.column.sanction")}</TableHead>
          <TableHead>{t("sanctions.column.target")}</TableHead>
          <TableHead>{t("sanctions.column.reason")}</TableHead>
          <TableHead>{t("sanctions.column.imposedAt")}</TableHead>
          <TableHead>{t("sanctions.column.status")}</TableHead>
          {action ? (
            <TableHead align="end">
              <span {...applyStyles(styles.muted)}>{t("sanctions.column.actions")}</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sanctions.map((sanction) => {
          const detail = sanctionDetail(sanction, t);
          return (
            <TableRow key={sanction.id}>
              <TableCell>
                <div {...applyStyles(styles.stack)}>
                  <Text tone="default" weight="semibold">
                    {sanctionTypeLabel(sanction.type, t)}
                  </Text>
                  {detail ? <Caption as="span">{detail}</Caption> : null}
                </div>
              </TableCell>
              <TableCell>
                <div {...applyStyles(styles.stack)}>
                  <Text tone="default">
                    {sanction.targetType === "player"
                      ? sanctionPlayerName(sanction, t)
                      : sanctionTeamName(sanction, t)}
                  </Text>
                  {sanction.targetType === "player" ? (
                    <Caption as="span">{sanctionTeamName(sanction, t)}</Caption>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Text tone="default" className={styles.reason}>
                  {sanction.reason}
                </Text>
              </TableCell>
              <TableCell>
                <time dateTime={sanction.imposedAt}>
                  {date.format(new Date(sanction.imposedAt))}
                </time>
              </TableCell>
              <TableCell>
                {sanction.revocation ? (
                  <div {...applyStyles(styles.stack)}>
                    <div {...applyStyles(styles.badges)}>
                      <Badge variant="outline">{t("sanctions.status.revoked")}</Badge>
                    </div>
                    <Caption as="span">
                      <time dateTime={sanction.revocation.revokedAt}>
                        {date.format(new Date(sanction.revocation.revokedAt))}
                      </time>
                      {" · "}
                      {sanction.revocation.reason}
                    </Caption>
                  </div>
                ) : (
                  <Badge variant="warning">{t("sanctions.status.active")}</Badge>
                )}
              </TableCell>
              {action ? <TableCell align="end">{action(sanction)}</TableCell> : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
