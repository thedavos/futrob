import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Button, Heading, Text } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import gamepadUrl from "@/assets/gamepad.svg";
import clubFinderUrl from "@/assets/club-finder.svg";
import calendarClockUrl from "@/assets/calendar-clock.svg";
import backgroundMatchUrl from "@/assets/background-match.png";
import backgroundStripesUrl from "@/assets/background-stripes.png";
import trophyUrl from "@/assets/trophy.png";
import backgroundDefaultUrl from "@/assets/background-default.png";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeBanner, HomeCard, type HomeCardLink } from "./home-card.tsx";
import { NextEncounterFixture } from "./home-next-encounter-fixture.tsx";
import { nextEncounterFixture } from "./home-next-encounter.styles.ts";
import { formatEncounterWhen } from "./player-home-copy.ts";
import type { PlayerHomeHeroSlot } from "./player-home-model.ts";

const styles = stylex.create({
  art: {
    display: "block",
    width: {
      default: "8rem",
      [media.md]: "10rem",
      [media.lg]: "12rem",
    },
    height: {
      default: "8rem",
      [media.md]: "10rem",
      [media.lg]: "12rem",
    },
    objectFit: "contain",
    flexShrink: 0,
    alignSelf: "center",
  },
  artPanel: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    flexGrow: 1,
    minHeight: "10rem",
    gap: "1rem",
  },
  artCopy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: "1rem",
  },
  emptyStack: {
    display: "flex",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2rem",
    minHeight: "14rem",
  },
  emptyFocus: {
    display: "flex",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    position: "relative",
    zIndex: 1,
  },
  artEmpty: {
    display: "block",
    width: {
      default: "12rem",
      [media.md]: "16rem",
      [media.lg]: "20rem",
    },
    height: "auto",
    aspectRatio: "532 / 253",
    objectFit: "contain",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  artMark: {
    display: "block",
    width: {
      default: "6.5rem",
      [media.md]: "8rem",
      [media.lg]: "9.5rem",
    },
    height: "auto",
    aspectRatio: "670 / 823",
    objectFit: "contain",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  fillStack: {
    display: "flex",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "1rem",
    position: "relative",
    zIndex: 1,
    paddingTop: "1.5rem",
    paddingInline: "1.5rem",
    paddingBottom: "1rem",
  },
  cta: {
    alignSelf: "center",
    marginTop: "auto",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.5rem",
  },
  matchup: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    textAlign: "center",
  },
  name: {
    textAlign: "center",
    fontWeight: 600,
  },
  vs: {
    fontWeight: 700,
    fontSize: "var(--text-2xl)",
    color: colors.mutedForeground,
  },
  when: {
    fontWeight: "var(--font-weight-medium)",
    color: colors.foreground,
  },
  roundBadge: {
    color: colors.primary,
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
  },
});

export function HomeHero({ slot }: { readonly slot: PlayerHomeHeroSlot }) {
  const { locale, t } = useI18n();

  switch (slot.kind) {
    case "onboarding":
      return (
        <HeroArtCard
          artSrc={gamepadUrl}
          backgroundUrl={backgroundMatchUrl}
          ctaLabel={t("player.home.cta.linkEa")}
          ctaTo="/player/game-accounts"
          look="empty"
          subtitle={t("player.home.hero.onboarding.subtitle")}
          title={t("player.home.hero.onboarding.title")}
        />
      );
    case "select-club":
      return (
        <HeroArtCard
          artSrc={clubFinderUrl}
          backgroundUrl={backgroundStripesUrl}
          ctaLabel={t("player.home.cta.selectClub")}
          ctaTo="/player/ea-clubs"
          look="empty-mark"
          subtitle={t("player.home.hero.selectClub.subtitle")}
          title={t("player.home.hero.selectClub.title")}
        />
      );
    case "next-encounter": {
      const { encounter } = slot;
      return (
        <HomeCard flush>
          <MatchPitchSurface
            away={{
              imageUrl: encounter.away.externalClub?.imageUrl ?? null,
              name: encounter.away.name,
            }}
            home={{
              imageUrl: encounter.home.externalClub?.imageUrl ?? null,
              name: encounter.home.name,
            }}
          >
            <div {...applyStyles(styles.fillStack)}>
              <div {...applyStyles(styles.header)}>
                <Heading>{t("player.home.hero.next.title")}</Heading>
                <Badge className={styles.roundBadge} variant="neutral">
                  {encounter.round
                    ? t("player.home.hero.next.round", {
                        competition: encounter.competition.name,
                        matchday: encounter.round.number,
                      })
                    : encounter.competition.name}
                </Badge>
              </div>
              <div {...applyStyles(styles.matchup)}>
                <NextEncounterFixture
                  away={
                    <EncounterClub
                      imageUrl={encounter.away.externalClub?.imageUrl ?? null}
                      name={encounter.away.name}
                    />
                  }
                  home={
                    <EncounterClub
                      imageUrl={encounter.home.externalClub?.imageUrl ?? null}
                      name={encounter.home.name}
                    />
                  }
                  meta={
                    <>
                      <Text align="center" className={styles.when} tone="default" weight="medium">
                        {formatEncounterWhen(
                          encounter.scheduledStartAt,
                          encounter.competition.timeZone,
                          locale,
                        )}
                      </Text>
                      <Badge variant="info">{t("player.home.hero.next.pending")}</Badge>
                    </>
                  }
                  vs={<span {...applyStyles(styles.vs)}>{t("player.home.hero.next.vs")}</span>}
                />
              </div>
              <Button className={styles.cta} render={<Link to="/player/competitions" />}>
                {t("player.home.cta.viewCompetition")}
              </Button>
            </div>
          </MatchPitchSurface>
        </HomeCard>
      );
    }
    case "no-upcoming":
      return (
        <HeroArtCard
          artSrc={calendarClockUrl}
          backgroundUrl={backgroundStripesUrl}
          ctaLabel={t("player.home.cta.competitions")}
          ctaTo="/player/competitions"
          look="empty-mark"
          subtitle={t("player.home.hero.next.emptySubtitle")}
          title={t("player.home.hero.next.emptyTitle")}
        />
      );
    case "no-competitions":
      return (
        <HeroArtCard
          artSrc={trophyUrl}
          backgroundUrl={backgroundDefaultUrl}
          ctaLabel={t("player.home.cta.exploreCompetitions")}
          ctaTo="/player/competitions"
          subtitle={t("player.home.hero.jump.subtitle")}
          title={t("player.home.hero.jump.title")}
        />
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
}

function HeroArtCard({
  artSrc,
  backgroundUrl,
  ctaLabel,
  ctaTo,
  look = "split",
  subtitle,
  title,
}: {
  readonly artSrc: string;
  readonly backgroundUrl: string;
  readonly ctaLabel: string;
  readonly ctaTo: HomeCardLink;
  readonly look?: "empty" | "empty-mark" | "split";
  readonly subtitle: string;
  readonly title: string;
}) {
  const banner = <HomeBanner look="hero" subtitle={subtitle} title={title} />;
  const cta = <Button render={<Link to={ctaTo} />}>{ctaLabel}</Button>;
  const art = <img alt="" data-outline="none" src={artSrc} {...applyStyles(heroArtStyle(look))} />;

  switch (look) {
    case "empty":
    case "empty-mark":
      return (
        <HomeCard backgroundUrl={backgroundUrl}>
          <div {...applyStyles(styles.emptyStack)}>
            {banner}
            <div {...applyStyles(styles.emptyFocus)}>
              {art}
              {cta}
            </div>
          </div>
        </HomeCard>
      );
    case "split":
      return (
        <HomeCard backgroundUrl={backgroundUrl}>
          <div {...applyStyles(styles.artPanel)}>
            <div {...applyStyles(styles.artCopy)}>
              {banner}
              {cta}
            </div>
            {art}
          </div>
        </HomeCard>
      );
    default: {
      const _exhaustive: never = look;
      return _exhaustive;
    }
  }
}

function heroArtStyle(look: "empty" | "empty-mark" | "split") {
  switch (look) {
    case "split":
      return styles.art;
    case "empty-mark":
      return styles.artMark;
    case "empty":
      return styles.artEmpty;
    default: {
      const _exhaustive: never = look;
      return _exhaustive;
    }
  }
}

function EncounterClub({
  imageUrl,
  name,
}: {
  readonly imageUrl: string | null;
  readonly name: string;
}) {
  return (
    <div {...applyStyles(nextEncounterFixture.club)}>
      <ClubCrestAvatar
        framed={false}
        imageUrl={imageUrl}
        name={name}
        {...applyStyles(nextEncounterFixture.crest)}
      />
      <span {...applyStyles(styles.name)}>{name}</span>
    </div>
  );
}
