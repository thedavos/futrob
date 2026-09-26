"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
  TextLink,
} from "@futrob/ui";
import trophyUrl from "@/assets/trophy.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useMyPlayerProfileQuery } from "./player-queries.ts";

export function PlayerCompetitionsEmptySection() {
  const { t } = useI18n();
  const titleId = useId();
  const profileQuery = useMyPlayerProfileQuery();
  const clubCount = profileQuery.data?.externalClubs.length ?? 0;
  const showSwitchClub = profileQuery.isSuccess && clubCount > 1;

  return (
    <EmptyState aria-labelledby={titleId} fill>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={trophyUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>{t("player.competitions.empty.title")}</EmptyStateTitle>
        <EmptyStateDescription>{t("player.competitions.empty.subtitle")}</EmptyStateDescription>
      </EmptyStateCopy>
      <EmptyStateActions>
        <Button render={<Link to="/player/competitions/explore" />}>
          {t("player.home.cta.exploreCompetitions")}
        </Button>
      </EmptyStateActions>
      {showSwitchClub ? (
        <EmptyStateFooter>
          {t("player.competitions.empty.otherClub")}{" "}
          <TextLink render={<Link to="/player/game-accounts" />} text="caption">
            {t("player.gameData.clubs.change")}
          </TextLink>
        </EmptyStateFooter>
      ) : null}
    </EmptyState>
  );
}
