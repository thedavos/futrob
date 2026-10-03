"use client";

import { Link } from "@tanstack/react-router";
import type { ExploreCompetitionDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  TextLink,
  typography,
  useCopyToClipboard,
} from "@futrob/ui";
import type { ReactNode } from "react";
import {
  CalendarBlankIcon,
  CheckIcon,
  DiscIcon,
  GameControllerIcon,
  GlobeHemisphereWestIcon,
  type Icon,
  ShareNetworkIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  competitionListBadgeVariant,
  competitionPlatformLabel,
  competitionRegionLabel,
  competitionScheduleLabel,
  competitionStatusLabel,
  competitionTeamsLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import { competitionCoverSrc } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./explore-competitions-page.styles.ts";
import { exploreCompetitionShareUrl } from "./explore-search.ts";
import { EXPLORE_ACTIONS, type ExploreViewerRelation } from "./explore-viewer-relation.ts";

export function ExploreCompetitionCard({
  item,
  relation,
}: {
  readonly item: ExploreCompetitionDto;
  readonly relation: ExploreViewerRelation;
}) {
  const { locale, t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const actions = EXPLORE_ACTIONS[relation];
  const { competition, organization, approvedTeamCount } = item;
  const shareUrl = exploreCompetitionShareUrl(competition.id);
  const scheduleLabel = competitionScheduleLabel(competition.schedule, locale, t);

  return (
    <Card className={styles.card} variant="flat">
      <CardHeader>
        <div {...applyStyles(styles.cardHeader)}>
          <img
            alt=""
            loading="lazy"
            src={competitionCoverSrc(competition.cover)}
            {...applyStyles(styles.mark)}
          />
          <div {...applyStyles(styles.cardCopy)}>
            <CardTitle className={styles.name} title={competition.name}>
              {competition.name}
            </CardTitle>
            <Caption {...applyStyles(typography.caption, styles.org)}>
              {t("player.competitions.explore.card.organizer", { name: organization.name })}
            </Caption>
          </div>
          <Badge variant={competitionListBadgeVariant(competition.status)}>
            {competitionStatusLabel(competition.status, t)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul {...applyStyles(styles.facts)}>
          <CardFact icon={GlobeHemisphereWestIcon}>
            {competitionRegionLabel(competition.region, t)}
          </CardFact>
          <CardFact icon={GameControllerIcon}>
            {competitionPlatformLabel(competition.platform)}
          </CardFact>
          <CardFact icon={DiscIcon}>{competition.gameEdition}</CardFact>
          <CardFact icon={UsersThreeIcon}>
            {competitionTeamsLabel(approvedTeamCount, competition.teams.max, t)}
          </CardFact>
          {scheduleLabel ? <CardFact icon={CalendarBlankIcon}>{scheduleLabel}</CardFact> : null}
        </ul>
      </CardContent>
      <CardFooter className={styles.footer}>
        {actions.view ? (
          <Button
            render={
              <Link
                params={{ competitionId: competition.id }}
                to="/player/competitions/$competitionId"
              />
            }
            className={styles.view}
            variant="outline"
          >
            {t("player.competitions.explore.card.view")}
          </Button>
        ) : null}
        {actions.share ? (
          <>
            <Button
              aria-label={t("player.competitions.explore.card.share")}
              onClick={() => void copyToClipboard(shareUrl)}
              size="icon"
              variant="outline"
            >
              {isCopied ? <CheckIcon aria-hidden /> : <ShareNetworkIcon aria-hidden />}
            </Button>
            <span aria-live="polite" {...applyStyles(styles.srOnly)}>
              {isCopied ? t("player.competitions.explore.card.shareCopied") : ""}
            </span>
          </>
        ) : null}
        {actions.manage ? (
          <TextLink
            render={
              <Link
                params={{ orgId: organization.id, competitionId: competition.id }}
                to="/orgs/$orgId/competitions/$competitionId"
              />
            }
            text="caption"
          >
            {t("player.competitions.explore.card.manage")}
          </TextLink>
        ) : null}
        {actions.participating ? (
          <Caption {...applyStyles(typography.caption, styles.participating)}>
            {t("player.competitions.explore.card.participating")}
          </Caption>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function CardFact({ children, icon: Icon }: { readonly children: ReactNode; readonly icon: Icon }) {
  return (
    <li {...applyStyles(typography.caption, styles.fact)}>
      <Icon aria-hidden size={16} {...applyStyles(styles.factIcon)} />
      <span>{children}</span>
    </li>
  );
}
