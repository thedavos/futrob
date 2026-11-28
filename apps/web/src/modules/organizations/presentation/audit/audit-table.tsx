"use client";

import { CaretRightIcon, UserIcon } from "@phosphor-icons/react";
import type { OrganizationAuditEntryDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Caption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  TextLink,
  vis,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  auditActionBadgeMeta,
  auditActionLabel,
  auditActorInitials,
  auditObjectMeta,
} from "./audit-labels.ts";
import { styles } from "./audit.styles.ts";

function AuditActionBadge({ action }: { readonly action: string }) {
  const { t } = useI18n();
  const meta = auditActionBadgeMeta(action);
  const BadgeIcon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      {BadgeIcon ? <BadgeIcon aria-hidden="true" {...applyStyles(styles.badgeIcon)} /> : null}
      {auditActionLabel(action, t)}
    </Badge>
  );
}

function AuditActor({ entry }: { readonly entry: OrganizationAuditEntryDto }) {
  const { t } = useI18n();
  const label = entry.actorName ?? entry.actorId ?? t("audit.systemActor");
  return (
    <div {...applyStyles(styles.actorCell)}>
      <Avatar aria-hidden="true" className={styles.avatar}>
        <AvatarFallback>
          {entry.actorName ? (
            auditActorInitials(entry.actorName)
          ) : (
            <UserIcon aria-hidden="true" size={12} />
          )}
        </AvatarFallback>
      </Avatar>
      <Text className={styles.actorName} tone={entry.actorId ? "default" : "muted"}>
        {label}
      </Text>
    </div>
  );
}

function AuditObjectLink({ entry }: { readonly entry: OrganizationAuditEntryDto }) {
  const { t } = useI18n();
  const objectMeta = auditObjectMeta(entry.object.type, t);
  const ObjectIcon = objectMeta.icon;
  const label = entry.object.label ?? entry.object.id;
  return (
    <div {...applyStyles(styles.objectCell)}>
      <ObjectIcon aria-hidden="true" {...applyStyles(styles.objectIcon)} />
      {entry.object.href ? (
        <TextLink href={entry.object.href} onClick={(event) => event.stopPropagation()}>
          {label}
        </TextLink>
      ) : (
        <Text tone="default">{label}</Text>
      )}
    </div>
  );
}

export function AuditTable({
  entries,
  selectedId,
  onSelect,
}: {
  readonly entries: readonly OrganizationAuditEntryDto[];
  readonly selectedId?: string | null;
  readonly onSelect: (entry: OrganizationAuditEntryDto) => void;
}) {
  const { t, locale } = useI18n();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <div {...applyStyles(styles.desktopOnly)}>
        <Table aria-label={t("audit.table.label")} className={styles.table} dense>
          <TableHeader>
            <TableRow>
              <TableHead>{t("audit.column.date")}</TableHead>
              <TableHead>{t("audit.column.action")}</TableHead>
              <TableHead>{t("audit.column.actor")}</TableHead>
              <TableHead>{t("audit.column.object")}</TableHead>
              <TableHead>{t("audit.column.reason")}</TableHead>
              <TableHead align="end" className={styles.detailActionCell}>
                <span {...applyStyles(vis.srOnly)}>{t("audit.column.details")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const actionLabel = auditActionLabel(entry.action, t);
              return (
                <TableRow
                  key={entry.id}
                  className={styles.clickableRow}
                  data-state={selectedId === entry.id ? "selected" : undefined}
                  onClick={() => onSelect(entry)}
                >
                  <TableCell className={styles.timeCell}>
                    <time dateTime={entry.occurredAt}>
                      {date.format(new Date(entry.occurredAt))}
                    </time>
                  </TableCell>
                  <TableCell>
                    <AuditActionBadge action={entry.action} />
                  </TableCell>
                  <TableCell>
                    <AuditActor entry={entry} />
                  </TableCell>
                  <TableCell>
                    <AuditObjectLink entry={entry} />
                  </TableCell>
                  <TableCell>
                    {entry.reason ? (
                      <Text className={styles.reasonCell} tone="default">
                        {entry.reason}
                      </Text>
                    ) : (
                      <span aria-label={t("audit.noReason")} {...applyStyles(styles.emptyDash)}>
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell align="end" className={styles.detailActionCell}>
                    <Button
                      aria-label={t("audit.detail.openFor", { action: actionLabel })}
                      dense
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(entry);
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <CaretRightIcon aria-hidden="true" size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div {...applyStyles(styles.mobileOnly)}>
        <ul aria-label={t("audit.table.label")} {...applyStyles(styles.mobileList)}>
          {entries.map((entry) => {
            const actionLabel = auditActionLabel(entry.action, t);
            return (
              <li key={entry.id} {...applyStyles(styles.mobileItem)}>
                <div {...applyStyles(styles.mobileRowTop)}>
                  <AuditActionBadge action={entry.action} />
                  <Caption as="span">
                    <time dateTime={entry.occurredAt}>
                      {date.format(new Date(entry.occurredAt))}
                    </time>
                  </Caption>
                </div>
                <div {...applyStyles(styles.mobileRowMeta)}>
                  <AuditActor entry={entry} />
                  <AuditObjectLink entry={entry} />
                </div>
                {entry.reason ? (
                  <Caption as="p" className={styles.mobileReason}>
                    {entry.reason}
                  </Caption>
                ) : null}
                <div {...applyStyles(styles.mobileFooter)}>
                  <Button
                    aria-label={t("audit.detail.openFor", { action: actionLabel })}
                    dense
                    onClick={() => onSelect(entry)}
                    type="button"
                    variant="ghost"
                  >
                    {t("audit.detail.open")}
                    <CaretRightIcon aria-hidden="true" size={14} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
