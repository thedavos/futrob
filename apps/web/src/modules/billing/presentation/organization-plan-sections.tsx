import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon, MinusCircleIcon } from "@phosphor-icons/react";
import type { GetOrganizationPlanResponse, PlanChange } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Body,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Progress,
  ProgressIndicator,
  ProgressTrack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextLink,
} from "@futrob/ui";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { nextPlan, planStatus, usageRows, type UsageRow } from "./organization-plan-model.ts";
import { styles } from "./organization-plan.styles.ts";
import { formatPlanDate, isOrganizationPlanKey, planNameKey } from "./plan-copy.ts";

type Plan = GetOrganizationPlanResponse;

const USAGE_LABEL = {
  activeCompetitions: "billing.usage.activeCompetitions",
  staffMembers: "billing.usage.staffMembers",
  providerSyncJobs: "billing.usage.providerSyncJobs",
} as const satisfies Record<UsageRow["id"], MessageKey>;

const USAGE_REACHED = {
  activeCompetitions: "billing.usage.reached.activeCompetitions",
  staffMembers: "billing.usage.reached.staffMembers",
  providerSyncJobs: "billing.usage.reached.providerSyncJobs",
} as const satisfies Record<UsageRow["id"], MessageKey>;

const FORMAT_LABEL: ReadonlyMap<string, MessageKey> = new Map(
  Object.entries({
    league: "competitionRules.format.league",
    knockout: "competitionRules.format.knockout",
    "groups-knockout": "competitionRules.format.groups-knockout",
    "league-playoffs": "competitionRules.format.league-playoffs",
  } as const satisfies Record<string, MessageKey>),
);

const CHANNEL_LABEL: ReadonlyMap<string, MessageKey> = new Map(
  Object.entries({
    web: "billing.channel.web",
    email: "billing.channel.email",
    announcements: "billing.channel.announcements",
  } as const satisfies Record<string, MessageKey>),
);

export function PlanSummaryCard({ plan }: { readonly plan: Plan }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const status = planStatus(plan);
  const upgrade = nextPlan(plan.plan.key);
  const statusText = (() => {
    switch (status.kind) {
      case "default":
        return t("billing.plan.status.default");
      case "active":
        return t("billing.plan.status.active");
      case "trialing":
        return t("billing.plan.status.trialing", { date: formatPlanDate(status.until, locale) });
      case "past_due":
        return t("billing.plan.status.past_due");
      case "lapsed":
        return t("billing.plan.status.lapsed", { plan: t(planNameKey(status.planKey)) });
    }
  })();
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("billing.plan.current")}
        </Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        <div {...applyStyles(styles.planLine)}>
          <span {...applyStyles(styles.planName)}>{t(planNameKey(plan.plan.key))}</span>
          <Badge variant={status.kind === "past_due" ? "warning" : "neutral"}>{statusText}</Badge>
        </div>
        <Caption>
          {upgrade
            ? t("billing.plan.upgrade", { plan: t(planNameKey(upgrade)) })
            : t("billing.plan.topPlan")}{" "}
          <TextLink render={<Link to="/pricing" />}>{t("billing.plan.compare")}</TextLink>
        </Caption>
      </CardContent>
    </Card>
  );
}

export function PlanUsageCard({ plan }: { readonly plan: Plan }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const rows = usageRows(plan);
  const sync = plan.quotas.find((quota) => quota.quota === "provider_sync_jobs");
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("billing.usage.title")}
        </Heading>
        <Caption>{t("billing.usage.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        <ul {...applyStyles(styles.usageList)}>
          {rows.map((row) => (
            <li key={row.id} {...applyStyles(styles.usageItem)}>
              <div {...applyStyles(styles.usageLine)}>
                <Body as="span">{t(USAGE_LABEL[row.id])}</Body>
                <Body as="span" {...applyStyles(styles.usageValue)}>
                  {row.limit === null
                    ? t("billing.usage.unlimited", { used: row.used })
                    : t("billing.usage.value", { used: row.used, limit: row.limit })}
                </Body>
              </div>
              {row.percent === null ? null : (
                <Progress aria-label={t(USAGE_LABEL[row.id])} value={row.percent}>
                  <ProgressTrack>
                    <ProgressIndicator />
                  </ProgressTrack>
                </Progress>
              )}
              {row.id === "providerSyncJobs" && sync ? (
                <Caption>
                  {t("billing.usage.resets", { date: formatPlanDate(sync.resetsAt, locale) })}
                  {sync.fairUse ? ` · ${t("billing.usage.fairUse")}` : null}
                </Caption>
              ) : null}
              {row.level === "reached" ? (
                <Alert variant="warning">
                  <AlertDescription>{t(USAGE_REACHED[row.id])}</AlertDescription>
                </Alert>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Feature({ included, label }: { readonly included: boolean; readonly label: string }) {
  const { t } = useI18n();
  const Icon = included ? CheckCircleIcon : MinusCircleIcon;
  return (
    <li {...applyStyles(styles.feature)}>
      <Icon
        aria-hidden
        weight={included ? "fill" : "regular"}
        {...applyStyles(styles.featureIcon, included ? styles.included : styles.excluded)}
      />
      <Body as="span" {...applyStyles(included ? null : styles.excludedText)}>
        {label}
        <span className="sr-only">
          {" "}
          ({included ? t("billing.features.included") : t("billing.features.notIncluded")})
        </span>
      </Body>
    </li>
  );
}

export function PlanFeaturesCard({ plan }: { readonly plan: Plan }) {
  const { t } = useI18n();
  const headingId = useId();
  const { features, limits } = plan.plan.entitlements;
  const list = (values: readonly string[], labels: ReadonlyMap<string, MessageKey>) =>
    values
      .map((value) => {
        const key = labels.get(value);
        return key ? t(key) : value;
      })
      .join(", ");
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel)}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("billing.features.title")}
        </Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        <ul {...applyStyles(styles.featureList)}>
          <Feature
            included
            label={t("billing.features.formats", {
              formats: list(features.competitionFormats, FORMAT_LABEL),
            })}
          />
          <Feature
            included
            label={
              limits.teamsPerCompetition === null
                ? t("billing.features.teamsUnlimited")
                : t("billing.features.teamsPerCompetition", { count: limits.teamsPerCompetition })
            }
          />
          <Feature
            included={features.automaticProviderSync}
            label={t("billing.features.automaticProviderSync")}
          />
          <Feature
            included={features.performanceRanking}
            label={t("billing.features.performanceRanking")}
          />
          <Feature
            included={features.premiumAnalytics}
            label={t("billing.features.premiumAnalytics")}
          />
          <Feature
            included={features.organizerAnalytics !== "none"}
            label={t(`billing.features.organizerAnalytics.${features.organizerAnalytics}`)}
          />
          <Feature
            included
            label={t(`billing.features.portalBranding.${features.portalBranding}`)}
          />
          <Feature
            included
            label={t("billing.features.notifications", {
              channels: list(features.notificationChannels, CHANNEL_LABEL),
            })}
          />
        </ul>
      </CardContent>
    </Card>
  );
}

export function PlanChangesCard({ changes }: { readonly changes: readonly PlanChange[] }) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const describe = (snapshot: PlanChange["after"]) =>
    t("billing.changes.assigned", {
      plan: isOrganizationPlanKey(snapshot.planKey)
        ? t(planNameKey(snapshot.planKey))
        : snapshot.planKey,
      status: t(`billing.changes.status.${snapshot.state.status}`),
    });
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel, styles.wide)}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("billing.changes.title")}
        </Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        {changes.length === 0 ? (
          <Caption {...applyStyles(styles.muted)}>{t("billing.changes.empty")}</Caption>
        ) : (
          <Table containerLabelledBy={headingId} dense>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{t("billing.changes.change")}</TableHead>
                <TableHead scope="col">{t("billing.changes.reason")}</TableHead>
                <TableHead scope="col">{t("billing.changes.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change) => (
                <TableRow key={change.id}>
                  <TableCell>
                    {change.before
                      ? t("billing.changes.from", {
                          before: describe(change.before),
                          after: describe(change.after),
                        })
                      : describe(change.after)}
                  </TableCell>
                  <TableCell>{change.reason}</TableCell>
                  <TableCell>{formatPlanDate(change.occurredAt, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
