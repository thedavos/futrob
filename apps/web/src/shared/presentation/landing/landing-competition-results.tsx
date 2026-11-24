"use client";

import type { ExploreCompetitionDto } from "@futrob/api-contracts";
import { applyStyles, Button, Caption, Text } from "@futrob/ui";
import { competitionCoverSrc } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionScheduleLabel,
  competitionTeamsLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import type { useOpenCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import { onboardingHandoffHref } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  LandingCapacity,
  LandingEmptyResult,
  LandingPlatformMark,
  LandingResultRow,
  LandingResultsSkeleton,
  landingResultStyles as styles,
} from "./landing-result-list.tsx";
import { joinCompetitionHandoff } from "./open-competitions-model.ts";

export type LandingCompetitionResultsProps = {
  readonly result: ReturnType<typeof useOpenCompetitionsQuery>;
  /** The submitted name; empty lists every open competition. */
  readonly query: string;
  /** The chosen platform, or `null` for every platform. */
  readonly platformLabel: string | null;
  /** Drops the name and the platform, back to every open competition. */
  readonly onShowAll: () => void;
};

/** Competitions with open registration matching the landing search, each one a way to join it. */
export function LandingCompetitionResults({
  result,
  query,
  platformLabel,
  onShowAll,
}: LandingCompetitionResultsProps) {
  const { t } = useI18n();
  if (result.isPending) {
    return <LandingResultsSkeleton label={t("landing.openCompetitions.loading")} />;
  }
  if (result.isError) {
    return (
      <div role="alert" {...applyStyles(styles.state)}>
        <Text look="body" tone="default">
          {t("landing.openCompetitions.error")}
        </Text>
        <Button onClick={() => void result.refetch()} variant="outline">
          {t("landing.openCompetitions.retry")}
        </Button>
      </div>
    );
  }
  const items = result.data.items;
  if (items.length === 0) {
    const filtered = Boolean(query) || platformLabel !== null;
    return (
      <LandingEmptyResult
        action={
          filtered ? (
            <Button onClick={onShowAll} variant="outline">
              {t("landing.openCompetitions.showAll")}
            </Button>
          ) : undefined
        }
        description={
          filtered
            ? t("landing.openCompetitions.emptyFilteredHint")
            : t("landing.openCompetitions.emptyHint")
        }
        title={
          query
            ? t("landing.openCompetitions.emptyQuery", { query })
            : platformLabel
              ? t("landing.openCompetitions.emptyPlatform", { platform: platformLabel })
              : t("landing.openCompetitions.empty")
        }
      />
    );
  }
  return (
    <div {...applyStyles(styles.results)}>
      <div {...applyStyles(styles.meta)}>
        <Caption>
          {platformLabel
            ? t("landing.openCompetitions.subtitlePlatform", { platform: platformLabel })
            : t("landing.openCompetitions.subtitle")}
        </Caption>
      </div>
      <ul aria-label={t("landing.openCompetitions.title")} {...applyStyles(styles.list)}>
        {items.map((item) => (
          <CompetitionRow item={item} key={item.competition.id} />
        ))}
      </ul>
    </div>
  );
}

function CompetitionRow({ item }: { readonly item: ExploreCompetitionDto }) {
  const { locale, t } = useI18n();
  const { competition, organization, approvedTeamCount } = item;
  const href = onboardingHandoffHref(joinCompetitionHandoff(competition.id, null));
  const facts = [
    organization.name,
    competitionFormatLabel(competition.format, t),
    competitionScheduleLabel(competition.schedule, locale, t),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const max = competition.teams.max;
  const teams = competitionTeamsLabel(approvedTeamCount, max, t);
  const remaining = max ? max - approvedTeamCount : null;
  return (
    <LandingResultRow
      action={t("landing.openCompetitions.join")}
      href={href}
      label={t("landing.openCompetitions.joinLabel", { competition: competition.name })}
    >
      <img
        alt=""
        data-outline="none"
        loading="lazy"
        src={competitionCoverSrc(competition.cover)}
        {...applyStyles(styles.thumb, styles.cover)}
      />
      <span {...applyStyles(styles.copy)}>
        <span {...applyStyles(styles.titleLine)}>
          <Text
            as="span"
            look="body"
            tone="default"
            weight="semibold"
            {...applyStyles(styles.name)}
          >
            {competition.name}
          </Text>
          <LandingPlatformMark
            label={competitionPlatformLabel(competition.platform)}
            platform={competition.platform}
          />
        </span>
        <Caption as="span">{facts}</Caption>
        {max ? (
          <LandingCapacity
            approved={approvedTeamCount}
            label={teams}
            max={max}
            remainingLabel={
              remaining !== null && remaining > 0 && remaining <= 2
                ? t("landing.openCompetitions.placesLeft", { count: remaining })
                : null
            }
          />
        ) : (
          <Caption as="span">{teams}</Caption>
        )}
      </span>
    </LandingResultRow>
  );
}
