import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import type { EncounterViewDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  elevation,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Score,
  Text,
  vis,
  type Icon,
} from "@futrob/ui";
import {
  ClockIcon,
  ProhibitIcon,
  ScalesIcon,
  SealCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { EncounterListReturn } from "./encounter-list-return.ts";
import { EncounterBreadcrumb, type ListLink } from "./encounter-page-skeleton.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

export function EncounterUnavailable({
  kind,
  link,
  retry,
  t,
}: {
  readonly kind: "forbidden" | "not_found" | "error";
  readonly link: ListLink;
  readonly retry?: () => void;
  readonly t: Translator;
}) {
  if (kind === "error" && retry) {
    return (
      <main {...applyStyles(styles.main)}>
        <h1 {...applyStyles(vis.srOnly)}>{t("encounter.error")}</h1>
        <EncounterBreadcrumb link={link} t={t} />
        <RetryAlert message={t("encounter.error")} retry={retry} t={t} />
      </main>
    );
  }
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>
          {kind === "forbidden" ? t("encounter.forbidden.title") : t("encounter.notFound.title")}
        </PageHeaderTitle>
        <PageHeaderDescription>
          {kind === "forbidden"
            ? t("encounter.forbidden.description")
            : t("encounter.notFound.description")}
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button render={link.element} role="link" variant="secondary">
            {link.back}
          </Button>
        </PageHeaderActions>
      </PageHeader>
    </main>
  );
}
import type { EncounterPreview, ScoreOutcome, TeamScore } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import type { Formats } from "./encounter-parts.tsx";

export function listLink({
  competitionId,
  listReturn,
  organizationId,
  t,
}: {
  readonly competitionId: string;
  readonly listReturn: EncounterListReturn | null;
  readonly organizationId: string;
  readonly t: Translator;
}): ListLink {
  const matches = {
    label: t("pages.competitionPlayer.matches.title"),
    back: t("encounter.backToMatches"),
  };
  const search = listReturn?.search ?? {};
  const from = listReturn?.from ?? "encounters";
  switch (from) {
    case "matches":
      return {
        ...matches,
        element: (
          <Link
            params={{ orgId: organizationId, competitionId }}
            search={search}
            to="/orgs/$orgId/competitions/$competitionId/matches"
          />
        ),
      };
    case "player-matches":
      return {
        ...matches,
        element: (
          <Link
            params={{ competitionId }}
            search={search}
            to="/player/competitions/$competitionId/matches"
          />
        ),
      };
    case "encounters":
      return {
        label: t("pages.competition.encounters.title"),
        back: t("encounter.backToEncounters"),
        element: (
          <Link
            params={{ orgId: organizationId, competitionId }}
            search={search}
            to="/orgs/$orgId/competitions/$competitionId/encounters"
          />
        ),
      };
    default: {
      const exhaustive: never = from;
      return exhaustive;
    }
  }
}

type HeroStatus = {
  readonly variant: ComponentProps<typeof Badge>["variant"];
  readonly icon: Icon;
  readonly label: string;
};

function heroStatusOf(
  selectionView: OfficialSelectionViewDto | null,
  view: EncounterViewDto,
  t: Translator,
): HeroStatus {
  const status = selectionView?.selection?.status ?? (view.score ? "approved" : null);
  switch (status) {
    case "approved":
      return { variant: "approved", icon: SealCheckIcon, label: t("encounter.selection.approved") };
    case "disputed":
      return {
        variant: "destructive",
        icon: WarningIcon,
        label: t("encounter.selection.status.disputed"),
      };
    case "organizer_review":
      return {
        variant: "warning",
        icon: ScalesIcon,
        label: t("encounter.selection.status.organizer_review"),
      };
    case "awaiting_opponent_confirmation":
      return {
        variant: "info",
        icon: ClockIcon,
        label: t("encounter.selection.status.awaiting_opponent_confirmation"),
      };
    case "voided":
      return {
        variant: "destructive",
        icon: ProhibitIcon,
        label: t("encounter.selection.status.voided"),
      };
    case "selection_in_progress":
    case "candidates_available":
    case "awaiting_provider_data":
    case "confirmed":
      return {
        variant: "neutral",
        icon: ClockIcon,
        label: t(`encounter.selection.status.${status}`),
      };
    case null:
      return { variant: "neutral", icon: ClockIcon, label: t("encounter.status.scheduled") };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function seriesLabelOf(view: EncounterViewDto, t: Translator): string {
  const count = view.officialMatches.length;
  if (count <= 1) return t("encounter.hero.seriesSingle");
  if (view.resolutionMode === "aggregate_score") {
    return t("encounter.hero.seriesAggregate", { count });
  }
  return t("encounter.hero.seriesIndependent", { count });
}

function outcomeLabelOf(outcome: ScoreOutcome, view: EncounterViewDto, t: Translator): string {
  return outcome === "draw"
    ? t("encounter.outcome.draw")
    : t("encounter.outcome.win", { team: view[outcome].name });
}

export function EncounterHero({
  approvedPreview,
  formats,
  selectionView,
  t,
  view,
}: {
  readonly approvedPreview: EncounterPreview | null;
  readonly formats: Formats;
  readonly selectionView: OfficialSelectionViewDto | null;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const crest = (side: EncounterViewDto["home"]) => ({
    imageUrl: side.externalClub?.imageUrl ?? null,
    name: side.name,
  });
  const status = heroStatusOf(selectionView, view, t);
  const StatusIcon = status.icon;

  const approvedSeries = approvedPreview?.series ?? null;
  const heroScore: { readonly score: TeamScore; readonly caption: string } | null =
    approvedSeries?.kind === "single"
      ? {
          score: approvedSeries.score,
          caption: t("encounter.hero.officialMeta", {
            outcome: outcomeLabelOf(approvedSeries.outcome, view, t),
          }),
        }
      : approvedSeries?.kind === "aggregate"
        ? {
            score: approvedSeries.total,
            caption: t("encounter.hero.officialAggregate", {
              outcome: outcomeLabelOf(approvedSeries.outcome, view, t),
            }),
          }
        : null;

  return (
    <Card className={styles.hero}>
      <MatchPitchSurface away={crest(view.away)} home={crest(view.home)}>
        <div aria-hidden="true" {...applyStyles(styles.heroWash)} />
        <div {...applyStyles(styles.heroBody)}>
          <div {...applyStyles(styles.heroTop)}>
            <Badge className={styles.roundBadge} variant="primary">
              {view.round
                ? `${view.competition.name} · ${
                    view.round.total
                      ? t("encounter.roundOf", {
                          number: view.round.number,
                          total: view.round.total,
                        })
                      : t("encounter.round", { number: view.round.number })
                  }`
                : view.competition.name}
            </Badge>
            <Badge variant={status.variant}>
              <StatusIcon aria-hidden="true" />
              {status.label}
            </Badge>
          </div>

          <div {...applyStyles(styles.matchup)}>
            <TeamIdentity label={t("encounter.side.home")} side={view.home} />
            <div {...applyStyles(styles.centerScore)}>
              {heroScore ? (
                <>
                  <span {...applyStyles(styles.heroScorePill, elevation.md)}>
                    <Score as="span">
                      <span {...applyStyles(vis.srOnly)}>
                        {`${heroScore.score.home}–${heroScore.score.away}`}
                      </span>
                      <span aria-hidden="true">
                        <span
                          {...applyStyles(
                            heroScore.score.home > heroScore.score.away && styles.scoreLead,
                          )}
                        >
                          {heroScore.score.home}
                        </span>
                        <span {...applyStyles(styles.scoreDash)}>–</span>
                        <span
                          {...applyStyles(
                            heroScore.score.away > heroScore.score.home && styles.scoreLead,
                          )}
                        >
                          {heroScore.score.away}
                        </span>
                      </span>
                    </Score>
                  </span>
                  <Caption as="span" className={[styles.heroSubPill, styles.heroSubApproved]}>
                    {heroScore.caption}
                  </Caption>
                </>
              ) : (
                <span aria-hidden="true" {...applyStyles(styles.vs)}>
                  {t("encounter.vs")}
                </span>
              )}
            </div>
            <TeamIdentity label={t("encounter.side.away")} side={view.away} />
          </div>

          <div {...applyStyles(styles.heroMeta)}>
            <Text tone="default" weight="medium">
              <time dateTime={view.scheduledStartAt}>
                {formats.kickoff.format(new Date(view.scheduledStartAt))}
              </time>
            </Text>
            <Caption as="span">
              {t("encounter.timeZone", { zone: view.competition.timeZone })}
            </Caption>
            <Caption as="span">·</Caption>
            <Caption as="span">{seriesLabelOf(view, t)}</Caption>
            {selectionView?.selection ? (
              <>
                <Caption as="span">·</Caption>
                <Caption as="span">
                  {t("encounter.selection.version", { version: selectionView.selection.version })} ·{" "}
                  {t("encounter.selection.round", { round: selectionView.selection.round })}
                </Caption>
              </>
            ) : null}
          </div>
        </div>
      </MatchPitchSurface>
    </Card>
  );
}

function TeamIdentity({
  label,
  side,
}: {
  readonly label: string;
  readonly side: EncounterViewDto["home"];
}) {
  return (
    <div {...applyStyles(styles.team)}>
      <ClubCrestAvatar
        className={styles.crest}
        imageUrl={side.externalClub?.imageUrl ?? null}
        name={side.name}
      />
      <Text tone="default" weight="semibold" className={styles.teamName}>
        {side.name}
      </Text>
      <Caption as="span">{label}</Caption>
    </div>
  );
}
