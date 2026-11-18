"use client";

import { useId, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { ExploreCompetitionDto, ExternalClubDto } from "@futrob/api-contracts";
import { applyStyles, Button, Caption, Card, Heading, Skeleton, Text } from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";
import { competitionCoverSrc } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionScheduleLabel,
  competitionTeamsLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import { useOpenCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import { authClient } from "@/modules/identity/auth-client.ts";
import { onboardingHandoffHref } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { competitionPlatformForClub, joinCompetitionHandoff } from "./open-competitions-model.ts";

const styles = stylex.create({
  card: {
    display: "grid",
    gap: space.s4,
    padding: space.s5,
  },
  header: {
    display: "grid",
    gap: space.s1,
  },
  list: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.s3,
    paddingBlock: space.s3,
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexBasis: "14rem",
    alignItems: "center",
    gap: space.s3,
  },
  cover: {
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    borderRadius: "var(--corner-md)",
    objectFit: "cover",
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.125rem",
  },
  name: {
    overflowWrap: "anywhere",
  },
  join: {
    maxWidth: "100%",
    whiteSpace: "normal",
  },
  skeleton: {
    height: "3rem",
  },
  state: {
    display: "grid",
    justifyItems: "start",
    gap: space.s2,
  },
});

/**
 * Up to six competitions with open registration, for a signed-out visitor. A picked club
 * narrows them to its platform when that maps to one competition platform, and «Unirme» carries
 * it into onboarding.
 */
export function OpenCompetitionsPanel({ club }: { readonly club: ExternalClubDto | null }) {
  const { t } = useI18n();
  const titleId = useId();
  const clubPlatform = competitionPlatformForClub(club);
  const [allPlatforms, setAllPlatforms] = useState(false);
  const platform = allPlatforms ? null : clubPlatform;
  const query = useOpenCompetitionsQuery(platform);
  const platformLabel = platform ? competitionPlatformLabel(platform) : null;

  return (
    <Card aria-labelledby={titleId} {...applyStyles(styles.card)}>
      <div {...applyStyles(styles.header)}>
        <Heading as="h3" id={titleId}>
          {t("landing.openCompetitions.title")}
        </Heading>
        <Caption>
          {platformLabel
            ? t("landing.openCompetitions.subtitlePlatform", { platform: platformLabel })
            : t("landing.openCompetitions.subtitle")}
        </Caption>
      </div>
      {query.isPending ? (
        <ul
          aria-busy="true"
          aria-label={t("landing.openCompetitions.loading")}
          {...applyStyles(styles.list)}
        >
          {[0, 1, 2].map((index) => (
            <li key={index} {...applyStyles(styles.row)}>
              <Skeleton {...applyStyles(styles.skeleton, styles.identity)} />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <div role="alert" {...applyStyles(styles.state)}>
          <Text look="body" tone="default">
            {t("landing.openCompetitions.error")}
          </Text>
          <Button onClick={() => void query.refetch()} variant="outline">
            {t("landing.openCompetitions.retry")}
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <div {...applyStyles(styles.state)}>
          <Text look="body" tone="default">
            {platformLabel
              ? t("landing.openCompetitions.emptyPlatform", { platform: platformLabel })
              : t("landing.openCompetitions.empty")}
          </Text>
          {platformLabel ? (
            <Button onClick={() => setAllPlatforms(true)} variant="outline">
              {t("landing.openCompetitions.showAll")}
            </Button>
          ) : (
            <Caption>{t("landing.openCompetitions.emptyHint")}</Caption>
          )}
        </div>
      ) : (
        <ul {...applyStyles(styles.list)}>
          {query.data.items.map((item) => (
            <OpenCompetitionRow club={club} item={item} key={item.competition.id} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function OpenCompetitionRow({
  club,
  item,
}: {
  readonly club: ExternalClubDto | null;
  readonly item: ExploreCompetitionDto;
}) {
  const { locale, t } = useI18n();
  const signedIn = authClient.useSession().data?.user != null;
  const { competition, organization, approvedTeamCount } = item;
  const href = onboardingHandoffHref(joinCompetitionHandoff(competition.id, club));
  const facts = [
    competitionFormatLabel(competition.format, t),
    competitionPlatformLabel(competition.platform),
  ].join(" · ");
  const schedule = competitionScheduleLabel(competition.schedule, locale, t);
  const capacity = [competitionTeamsLabel(approvedTeamCount, competition.teams.max, t), schedule]
    .filter((part): part is string => part !== null)
    .join(" · ");
  return (
    <li {...applyStyles(styles.row)}>
      <div {...applyStyles(styles.identity)}>
        <img
          alt=""
          loading="lazy"
          src={competitionCoverSrc(competition.cover)}
          {...applyStyles(styles.cover)}
        />
        <div {...applyStyles(styles.copy)}>
          <Text look="body" tone="default" weight="semibold" {...applyStyles(styles.name)}>
            {competition.name}
          </Text>
          <Caption>
            {t("player.competitions.explore.card.organizer", { name: organization.name })}
          </Caption>
          <Caption>{facts}</Caption>
          <Caption>{capacity}</Caption>
        </div>
      </div>
      <Button
        aria-label={
          club
            ? t("landing.openCompetitions.joinWithLabel", {
                competition: competition.name,
                club: club.name,
              })
            : t("landing.openCompetitions.joinLabel", { competition: competition.name })
        }
        className={styles.join}
        render={signedIn ? <a href={href} /> : <Link search={{ redirectTo: href }} to="/signup" />}
        variant="secondary"
      >
        {club
          ? t("landing.openCompetitions.joinWith", { club: club.name })
          : t("landing.openCompetitions.join")}
      </Button>
    </li>
  );
}
