"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { CompetitionExploreListingDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Switch, Text, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OverviewCard, ViewAllChevron } from "./competition-overview-card.tsx";
import { OverviewPublishingBodySkeleton } from "./competition-overview-skeleton.tsx";

const styles = stylex.create({
  row: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    cursor: "pointer",
  },
  switchBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: colors.border,
  },
  metaList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    margin: 0,
  },
  metaRow: {
    display: "flex",
    minHeight: "1.75rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  metaTerm: {
    margin: 0,
  },
  metaValue: {
    margin: 0,
    minWidth: 0,
    textAlign: "end",
  },
  actionLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    fontWeight: "var(--font-weight-medium)",
    textDecorationLine: "none",
  },
  icon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  error: {
    color: colors.danger,
  },
});

/** What the organizer sees and changes about the competition's place in Explore. */
export interface ExploreListingControl {
  readonly value: CompetitionExploreListingDto;
  readonly saving: boolean;
  readonly failed: boolean;
  readonly onChange: (next: CompetitionExploreListingDto) => void;
}

export function CompetitionExploreListingCard({
  competitionId,
  control,
  organizationId,
  pending = false,
  portalHref = null,
  timeZone = null,
}: {
  readonly competitionId?: string;
  readonly control: ExploreListingControl | null;
  readonly organizationId?: string;
  /** Identity is still loading; keep the publishing card's layout reserved. */
  readonly pending?: boolean;
  readonly portalHref?: string | null;
  readonly timeZone?: string | null;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const switchId = useId();
  const descriptionId = useId();
  const listed = control?.value === "listed";
  const hasRulesLink = Boolean(organizationId && competitionId);
  const hasMeta = portalHref !== null || timeZone !== null || hasRulesLink;

  if (pending) {
    return (
      <OverviewCard title={t("competition.overview.publishing.title")} titleId={titleId}>
        <OverviewPublishingBodySkeleton />
      </OverviewCard>
    );
  }

  if (!control && !hasMeta) return null;

  return (
    <OverviewCard title={t("competition.overview.publishing.title")} titleId={titleId}>
      {control ? (
        <div {...applyStyles(styles.switchBlock)}>
          <label htmlFor={switchId} {...applyStyles(styles.row)}>
            <Text look="label" tone="default">
              {t("competition.overview.exploreListing.label")}
            </Text>
            <Switch
              aria-describedby={descriptionId}
              checked={listed}
              disabled={control.saving}
              id={switchId}
              onCheckedChange={(checked) => control.onChange(checked ? "listed" : "unlisted")}
            />
          </label>
          <Caption aria-live="polite" as="p" id={descriptionId}>
            {control.saving
              ? t("competition.overview.exploreListing.saving")
              : t(
                  listed
                    ? "competition.overview.exploreListing.listed"
                    : "competition.overview.exploreListing.unlisted",
                )}
          </Caption>
          {control.failed ? (
            <Caption as="p" role="alert" {...applyStyles(styles.error)}>
              {t("competition.overview.exploreListing.error")}
            </Caption>
          ) : null}
        </div>
      ) : null}

      {control && hasMeta ? <div aria-hidden="true" {...applyStyles(styles.divider)} /> : null}

      {hasMeta ? (
        <dl {...applyStyles(styles.metaList)}>
          {portalHref ? (
            <div {...applyStyles(styles.metaRow)}>
              <dt {...applyStyles(styles.metaTerm)}>
                <Caption as="span">{t("competition.overview.publishing.portal")}</Caption>
              </dt>
              <dd {...applyStyles(styles.metaValue)}>
                <TextLink
                  className={styles.actionLink}
                  href={portalHref}
                  rel="noopener"
                  target="_blank"
                  text="caption"
                >
                  {t("competition.overview.publishing.openPortal")}
                  <ArrowSquareOutIcon aria-hidden="true" {...applyStyles(styles.icon)} />
                </TextLink>
              </dd>
            </div>
          ) : null}
          {timeZone ? (
            <div {...applyStyles(styles.metaRow)}>
              <dt {...applyStyles(styles.metaTerm)}>
                <Caption as="span">{t("competition.overview.publishing.timeZone")}</Caption>
              </dt>
              <dd {...applyStyles(styles.metaValue)}>
                <Caption as="span" tone="default">
                  {timeZone}
                </Caption>
              </dd>
            </div>
          ) : null}
          {hasRulesLink && organizationId && competitionId ? (
            <div {...applyStyles(styles.metaRow)}>
              <dt {...applyStyles(styles.metaTerm)}>
                <Caption as="span">{t("competition.overview.publishing.rules")}</Caption>
              </dt>
              <dd {...applyStyles(styles.metaValue)}>
                <TextLink
                  className={styles.actionLink}
                  render={
                    <Link
                      params={{ orgId: organizationId, competitionId }}
                      to="/orgs/$orgId/competitions/$competitionId/rules"
                    />
                  }
                  text="caption"
                >
                  {t("competition.overview.publishing.viewRules")}
                  <ViewAllChevron />
                </TextLink>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </OverviewCard>
  );
}
