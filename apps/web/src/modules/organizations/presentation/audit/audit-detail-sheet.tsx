"use client";

import { ArrowUpRightIcon, CheckIcon, CopyIcon, UserIcon } from "@phosphor-icons/react";
import type { OrganizationAuditEntryDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Badge,
  Body,
  Button,
  Caption,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
  Separator,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Text,
  TextLink,
  useCopyToClipboard,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  auditActionBadgeMeta,
  auditActionLabel,
  auditActorInitials,
  auditObjectMeta,
} from "./audit-labels.ts";
import { styles } from "./audit.styles.ts";

function CopyableCode({ label, value }: { readonly label: string; readonly value: string }) {
  const { t } = useI18n();
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <div {...applyStyles(styles.copyValueRow)}>
      <code {...applyStyles(styles.monoValue)}>{value}</code>
      <Button
        aria-label={t("audit.detail.copyLabel", { field: label })}
        dense
        onClick={() => void copyToClipboard(value)}
        type="button"
        variant="ghost"
      >
        {isCopied ? (
          <>
            <CheckIcon aria-hidden="true" size={14} />
            {t("audit.detail.copied")}
          </>
        ) : (
          <>
            <CopyIcon aria-hidden="true" size={14} />
            {t("audit.detail.copy")}
          </>
        )}
      </Button>
    </div>
  );
}

export function AuditDetailSheet({
  entry,
  activeActorFilter,
  onClose,
  onFilterByActor,
}: {
  readonly entry: OrganizationAuditEntryDto | null;
  readonly activeActorFilter?: string;
  readonly onClose: () => void;
  readonly onFilterByActor?: (actorId: string) => void;
}) {
  const { t, locale } = useI18n();
  const localFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
  const utcFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  });

  if (!entry) {
    return (
      <Sheet open={false} onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <SheetContent closeLabel={t("audit.detail.close")} side="right" />
      </Sheet>
    );
  }

  const badgeMeta = auditActionBadgeMeta(entry.action);
  const BadgeIcon = badgeMeta.icon;
  const actionLabel = auditActionLabel(entry.action, t);
  const objectMeta = auditObjectMeta(entry.object.type, t);
  const ObjectIcon = objectMeta.icon;
  const actorLabel = entry.actorName ?? entry.actorId ?? t("audit.systemActor");
  const occurred = new Date(entry.occurredAt);
  const canFilterActor =
    Boolean(entry.actorId) && Boolean(onFilterByActor) && entry.actorId !== activeActorFilter;

  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent closeLabel={t("audit.detail.close")} side="right">
        <SheetHeader>
          <div {...applyStyles(styles.sheetHeaderBadge)}>
            <Badge variant={badgeMeta.variant}>
              {BadgeIcon ? (
                <BadgeIcon aria-hidden="true" {...applyStyles(styles.badgeIcon)} />
              ) : null}
              {actionLabel}
            </Badge>
          </div>
          <SheetTitle>{entry.object.label ?? entry.object.id}</SheetTitle>
          <SheetDescription>
            <time dateTime={entry.occurredAt}>{localFormatter.format(occurred)}</time>
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div {...applyStyles(styles.sheetBodyStack)}>
            <section {...applyStyles(styles.sheetSection)}>
              <SectionTitle as="h3">{t("audit.detail.reason")}</SectionTitle>
              {entry.reason ? (
                <div {...applyStyles(styles.reasonBlock)}>
                  <Body>{entry.reason}</Body>
                </div>
              ) : (
                <Caption>{t("audit.noReason")}</Caption>
              )}
            </section>

            <section {...applyStyles(styles.sheetSection)}>
              <SectionTitle as="h3">{t("audit.detail.object")}</SectionTitle>
              <div {...applyStyles(styles.objectCell)}>
                <ObjectIcon aria-hidden="true" {...applyStyles(styles.objectIcon)} />
                {entry.object.href ? (
                  <TextLink href={entry.object.href}>
                    {entry.object.label ?? entry.object.id}
                  </TextLink>
                ) : (
                  <Text tone="default">{entry.object.label ?? entry.object.id}</Text>
                )}
                <Caption>· {objectMeta.label}</Caption>
              </div>
            </section>

            <section {...applyStyles(styles.sheetSection)}>
              <SectionTitle as="h3">{t("audit.detail.actor")}</SectionTitle>
              <div {...applyStyles(styles.actorDetailRow)}>
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
                  <Text tone={entry.actorId ? "default" : "muted"} weight="medium">
                    {actorLabel}
                  </Text>
                </div>
                {canFilterActor ? (
                  <Button
                    dense
                    onClick={() => {
                      if (entry.actorId && onFilterByActor) {
                        onFilterByActor(entry.actorId);
                        onClose();
                      }
                    }}
                    type="button"
                    variant="outline"
                  >
                    {t("audit.detail.filterByActor")}
                  </Button>
                ) : null}
              </div>
            </section>

            <Separator />

            <section {...applyStyles(styles.sheetSection)}>
              <SectionTitle as="h3">{t("audit.detail.technicalTitle")}</SectionTitle>
              <MetaList columns={1}>
                <MetaItem>
                  <MetaTerm>{t("audit.detail.actorId")}</MetaTerm>
                  <MetaValue>
                    {entry.actorId ? (
                      <CopyableCode label={t("audit.detail.actorId")} value={entry.actorId} />
                    ) : (
                      <Caption>{t("audit.detail.notRecorded")}</Caption>
                    )}
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{t("audit.detail.correlationId")}</MetaTerm>
                  <MetaValue>
                    {entry.requestId ? (
                      <CopyableCode
                        label={t("audit.detail.correlationId")}
                        value={entry.requestId}
                      />
                    ) : (
                      <Caption>{t("audit.detail.notRecorded")}</Caption>
                    )}
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{t("audit.detail.actionCode")}</MetaTerm>
                  <MetaValue>
                    <code {...applyStyles(styles.monoValue)}>{entry.action}</code>
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{t("audit.detail.eventId")}</MetaTerm>
                  <MetaValue>
                    <CopyableCode label={t("audit.detail.eventId")} value={entry.id} />
                  </MetaValue>
                </MetaItem>
                <MetaItem>
                  <MetaTerm>{t("audit.detail.occurredAtUtc")}</MetaTerm>
                  <MetaValue>
                    <time dateTime={entry.occurredAt}>{utcFormatter.format(occurred)} UTC</time>
                  </MetaValue>
                </MetaItem>
              </MetaList>
            </section>
          </div>
        </SheetBody>

        <SheetFooter>
          {entry.object.href ? (
            <Button
              dense
              nativeButton={false}
              render={<a href={entry.object.href} />}
              role="link"
              variant="secondary"
            >
              {t("audit.detail.openObject")}
              <ArrowUpRightIcon aria-hidden="true" size={14} />
            </Button>
          ) : null}
          <SheetClose render={<Button dense type="button" variant="outline" />}>
            {t("audit.detail.close")}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
