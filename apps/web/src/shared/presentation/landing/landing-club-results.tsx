"use client";

import type { ExternalClubDto } from "@futrob/api-contracts";
import { applyStyles, Caption, Text } from "@futrob/ui";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import type { usePublicSearchClubsMutation } from "@/modules/game-data/presentation/game-data-queries.ts";
import { onboardingHandoffHref } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { SupportErrorAlert } from "@/shared/presentation/support-error-alert.tsx";
import {
  LandingEmptyResult,
  LandingResultRow,
  LandingResultsSkeleton,
  landingResultStyles as styles,
} from "./landing-result-list.tsx";

/**
 * Every club one EA search returns (EA answers at most ten): more rows cost no extra request,
 * and a common name like «Real» needs them to reach the visitor's own club.
 */
const LANDING_CLUB_RESULTS_LIMIT = 10;

export type LandingClubResultsProps = {
  readonly search: ReturnType<typeof usePublicSearchClubsMutation>;
  readonly platformLabel: string;
  /** Seconds left before the rate limit lets the visitor search again. */
  readonly rateLimitedFor: number;
};

/** EA clubs found by the landing search, each one a way to sign up with it already chosen. */
export function LandingClubResults({
  search,
  platformLabel,
  rateLimitedFor,
}: LandingClubResultsProps) {
  const { t } = useI18n();
  if (search.isPending) {
    return <LandingResultsSkeleton label={t("gameData.clubSearch.searching")} />;
  }
  if (search.error) {
    const error = search.error;
    const rateLimited = GameDataClientError.is(error) && Boolean(error.retryAfterSeconds);
    return (
      <SupportErrorAlert
        error={{
          message: rateLimited
            ? t("gameData.clubSearch.rateLimited")
            : t("gameData.clubSearch.error"),
          requestId: GameDataClientError.is(error) ? error.requestId : undefined,
          retryAfterSeconds: rateLimitedFor || undefined,
        }}
      />
    );
  }
  if (!search.data) {
    return (
      <div {...applyStyles(styles.state)}>
        <Caption>{t("gameData.clubSearch.source")}</Caption>
      </div>
    );
  }
  const clubs = search.data.clubs.slice(0, LANDING_CLUB_RESULTS_LIMIT);
  if (clubs.length === 0) {
    return (
      <LandingEmptyResult
        description={t("landing.search.clubEmptyHint")}
        title={t("landing.search.clubEmpty", {
          query: search.variables?.query ?? "",
          platform: platformLabel,
        })}
      />
    );
  }
  return (
    <div {...applyStyles(styles.results)}>
      <div {...applyStyles(styles.meta)}>
        <Caption>
          {t("landing.search.clubCount", { count: clubs.length, platform: platformLabel })}
        </Caption>
        <Caption>{t("landing.search.clubSource")}</Caption>
      </div>
      <ul aria-label={t("gameData.clubSearch.results")} {...applyStyles(styles.list)}>
        {clubs.map((club) => (
          <ClubRow club={club} key={club.externalClubId} />
        ))}
      </ul>
    </div>
  );
}

function ClubRow({ club }: { readonly club: ExternalClubDto }) {
  const { t } = useI18n();
  const href = onboardingHandoffHref({
    kind: "club",
    locator: {
      providerKey: club.providerKey,
      externalClubId: club.externalClubId,
      platform: club.platform,
      gameEdition: club.gameEdition,
    },
  });
  const crest = applyStyles(styles.thumb);
  return (
    <LandingResultRow
      action={t("landing.search.clubAction")}
      href={href}
      label={t("landing.search.clubCtaLabel", { club: club.name })}
    >
      <ClubCrestAvatar
        className={crest.className}
        framed={!club.imageUrl}
        imageUrl={club.imageUrl}
        name={club.name}
        style={crest.style}
      />
      <span {...applyStyles(styles.copy)}>
        <Text as="span" look="body" tone="default" weight="semibold" {...applyStyles(styles.name)}>
          {club.name}
        </Text>
        <Caption as="span">
          {eaPlatformLabel(club.platform)} · {formatProviderGameEdition(club.gameEdition)} ·{" "}
          <span {...applyStyles(styles.id)}>
            {t("landing.search.clubId", { id: club.externalClubId })}
          </span>
        </Caption>
      </span>
    </LandingResultRow>
  );
}
