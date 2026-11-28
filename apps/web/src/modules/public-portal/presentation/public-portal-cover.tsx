import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import type {
  GetPublicRankingResponse,
  GetPublicStandingsResponse,
  PublicCalendarEntryDto,
  PublicRankingKindDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Eyebrow,
  Heading,
  Score,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  TextLink,
  typography,
} from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  featuredCoverEncounter,
  latestResults,
  publicStandingsCut,
  upcomingEntries,
  type PortalRef,
} from "./public-portal-model.ts";
import { CoverFeaturedMatchCard, CoverPodiumBlock } from "./public-portal-cover-hero.tsx";
import { PortalEncounterList } from "./public-portal-shared.tsx";
import { PortalEmpty, PortalError } from "./public-portal-states.tsx";
import { coverStyles } from "./public-portal-cover.styles.ts";

const COVER_LIMIT = 3;
const MINI_STANDINGS_LIMIT = 5;

export interface PortalCalendar {
  readonly timeZone: string;
  readonly entries: readonly PublicCalendarEntryDto[];
}

export interface CoverLeaderItem {
  readonly kind: PublicRankingKindDto;
  readonly playerName: string;
  readonly teamName: string | null;
  readonly value: number;
  readonly matchesPlayed: number;
}

export function coverLeadersFromRankings(
  rankings: readonly (GetPublicRankingResponse["ranking"] | null)[],
): readonly CoverLeaderItem[] {
  const items: CoverLeaderItem[] = [];
  for (const ranking of rankings) {
    const first = ranking?.rows[0];
    if (!ranking || !first) continue;
    items.push({
      kind: ranking.kind,
      playerName: first.playerName,
      teamName: first.teamName,
      value: first.value,
      matchesPlayed: first.matchesPlayed,
    });
  }
  return items;
}

function CoverStandingsCard({
  portalRef,
  standings,
}: {
  readonly portalRef: PortalRef;
  readonly standings: GetPublicStandingsResponse["standings"];
}) {
  const { locale, t } = useI18n();
  const headingId = useId();
  const signed = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const crest = applyStyles(coverStyles.crestMd);
  const cut = publicStandingsCut(standings);
  const visible = standings.rows.slice(0, MINI_STANDINGS_LIMIT);

  return (
    <Card className={coverStyles.sectionCard}>
      <CardHeader className={coverStyles.sectionHeader}>
        <Heading as="h2" className={typography.title} id={headingId}>
          {t("portal.cover.standings")}
        </Heading>
        <TextLink
          className={coverStyles.sectionAction}
          render={<Link params={portalRef} to="/$organizationSlug/$competitionKey/standings" />}
          text="caption"
        >
          {t("portal.cover.standingsLink")}
          <CaretRightIcon aria-hidden="true" size={16} />
        </TextLink>
      </CardHeader>
      <CardContent className={coverStyles.sectionBody}>
        <Table containerLabelledBy={headingId} dense>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("standings.col.position")}</TableHead>
              <TableHead scope="col">{t("standings.col.team")}</TableHead>
              <TableHead align="end" scope="col">
                {t("standings.col.played")}
              </TableHead>
              <TableHead align="end" scope="col">
                {t("standings.col.goalDifference")}
              </TableHead>
              <TableHead align="end" scope="col">
                {t("standings.col.points")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={`${row.position}:${row.teamName}`}>
                <TableCell className={coverStyles.miniPosCell}>
                  {cut !== null && row.position <= cut ? (
                    <span aria-hidden="true" {...applyStyles(coverStyles.zoneBar)} />
                  ) : null}
                  <Score as="span" size="table">
                    {row.position}
                  </Score>
                </TableCell>
                <TableCell>
                  <span {...applyStyles(coverStyles.teamRow)}>
                    <ClubCrestAvatar
                      className={crest.className}
                      imageUrl={null}
                      name={row.teamName}
                      style={crest.style}
                    />
                    <Text weight="semibold">{row.teamName}</Text>
                  </span>
                </TableCell>
                <TableCell align="end">{row.played}</TableCell>
                <TableCell align="end">{signed.format(row.goalDifference)}</TableCell>
                <TableCell align="end" className={coverStyles.miniPoints}>
                  {row.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {cut !== null ? (
          <Caption as="p" className={coverStyles.cutNote}>
            <span aria-hidden="true" {...applyStyles(coverStyles.zoneBar, coverStyles.zoneKey)} />
            {t("standings.playoffCut", { count: cut })}
          </Caption>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CoverLeadersCard({
  leaders,
  portalRef,
}: {
  readonly leaders: readonly CoverLeaderItem[];
  readonly portalRef: PortalRef;
}) {
  const { locale, t } = useI18n();
  const headingId = useId();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <Card className={coverStyles.sectionCard}>
      <CardHeader className={coverStyles.sectionHeader}>
        <Heading as="h2" className={typography.title} id={headingId}>
          {t("portal.cover.leaders")}
        </Heading>
        <TextLink
          className={coverStyles.sectionAction}
          render={<Link params={portalRef} to="/$organizationSlug/$competitionKey/rankings" />}
          text="caption"
        >
          {t("portal.cover.rankingsLink")}
          <CaretRightIcon aria-hidden="true" size={16} />
        </TextLink>
      </CardHeader>
      <CardContent className={coverStyles.sectionBody}>
        {leaders.length === 0 ? (
          <Caption as="p" className={coverStyles.emptyBody}>
            {t("portal.cover.leadersEmpty")}
          </Caption>
        ) : (
          <ul aria-labelledby={headingId} {...applyStyles(coverStyles.leadersList)}>
            {leaders.map((item, index) => (
              <li key={item.kind} {...applyStyles(coverStyles.leaderRowItem)}>
                <Link
                  params={portalRef}
                  search={{ kind: item.kind }}
                  to="/$organizationSlug/$competitionKey/rankings"
                  {...applyStyles(coverStyles.leaderRowLink)}
                >
                  <div {...applyStyles(coverStyles.leaderRowCopy)}>
                    <Eyebrow>{t(`competition.rankings.kind.${item.kind}`)}</Eyebrow>
                    <Text weight="semibold">{item.playerName}</Text>
                    <Caption as="span">
                      {[
                        item.teamName,
                        t("portal.cover.matchesPlayed", { count: item.matchesPlayed }),
                      ]
                        .filter((part): part is string => part !== null)
                        .join(" · ")}
                    </Caption>
                  </div>
                  <div {...applyStyles(coverStyles.leaderRowValue)}>
                    <Score
                      as="span"
                      className={index === 0 ? coverStyles.leaderRowPrimary : undefined}
                      size="table"
                    >
                      {number.format(item.value)}
                    </Score>
                    <CaretRightIcon
                      aria-hidden="true"
                      size={16}
                      {...applyStyles(coverStyles.caretMuted)}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CoverCalendarSection({
  actionHref,
  emptyLabel,
  entries,
  timeZone,
  title,
}: {
  readonly actionHref?: PortalRef;
  readonly emptyLabel: string;
  readonly entries: readonly PublicCalendarEntryDto[];
  readonly timeZone: string;
  readonly title: string;
}) {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} {...applyStyles(coverStyles.sectionCard)}>
      <Card className={coverStyles.sectionCard}>
        <CardHeader className={coverStyles.sectionHeader}>
          <Heading as="h2" className={typography.title} id={headingId}>
            {title}
          </Heading>
          {actionHref ? (
            <TextLink
              className={coverStyles.sectionAction}
              render={<Link params={actionHref} to="/$organizationSlug/$competitionKey/calendar" />}
              text="caption"
            >
              {t("portal.cover.calendarLink")}
              <CaretRightIcon aria-hidden="true" size={16} />
            </TextLink>
          ) : null}
        </CardHeader>
        <CardContent className={coverStyles.sectionBody}>
          {entries.length > 0 ? (
            <PortalEncounterList bare compact entries={entries} timeZone={timeZone} />
          ) : (
            <Caption as="p" className={coverStyles.emptyBody}>
              {emptyLabel}
            </Caption>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * Hybrid Cover (Alternative B + A): editorial Podium and MatchPitchSurface featured encounter,
 * paired with Official Table, Individual Leaders, and latest/upcoming calendar cards.
 */
export function PortalCoverView({
  calendar,
  leaders = [],
  onCalendarRetry,
  portalRef,
  standings = null,
}: {
  readonly calendar: PortalCalendar | null;
  readonly leaders?: readonly CoverLeaderItem[];
  /**
   * Set only when the calendar read failed. The Cover then shows a retry in place of the fixture
   * blocks instead of claiming the calendar is not published yet (ADR-0024).
   */
  readonly onCalendarRetry?: () => void;
  readonly portalRef: PortalRef;
  readonly standings?: GetPublicStandingsResponse["standings"] | null;
}) {
  const { t } = useI18n();
  const entries = calendar?.entries ?? [];
  const standingRows = standings?.rows ?? [];
  const featured = featuredCoverEncounter(entries);
  const upcoming = upcomingEntries(entries, COVER_LIMIT);
  const results = latestResults(entries, COVER_LIMIT);

  const calendarFailed = onCalendarRetry !== undefined;

  if (
    !calendarFailed &&
    entries.length === 0 &&
    standingRows.length === 0 &&
    leaders.length === 0
  ) {
    return (
      <PortalEmpty
        description={t("portal.noFixture.description")}
        title={t("portal.noFixture.title")}
      />
    );
  }

  const hasPodium = standingRows.length > 0;
  const hasFeatured = featured !== null && calendar !== null;

  return (
    <div {...applyStyles(coverStyles.stack)}>
      {hasPodium || hasFeatured ? (
        <div {...applyStyles(hasPodium && hasFeatured ? coverStyles.topGrid : coverStyles.stack)}>
          {hasPodium ? <CoverPodiumBlock rows={standingRows} /> : null}
          {hasFeatured ? (
            <CoverFeaturedMatchCard entry={featured} timeZone={calendar.timeZone} />
          ) : null}
        </div>
      ) : null}

      {hasPodium || leaders.length > 0 ? (
        <div
          {...applyStyles(
            hasPodium && leaders.length > 0 ? coverStyles.twoCols : coverStyles.stack,
          )}
        >
          {hasPodium && standings ? (
            <CoverStandingsCard portalRef={portalRef} standings={standings} />
          ) : null}
          {leaders.length > 0 || hasPodium ? (
            <CoverLeadersCard leaders={leaders} portalRef={portalRef} />
          ) : null}
        </div>
      ) : null}

      {onCalendarRetry ? <PortalError onRetry={onCalendarRetry} /> : null}

      {calendar && entries.length > 0 ? (
        <div {...applyStyles(coverStyles.twoCols)}>
          <CoverCalendarSection
            actionHref={portalRef}
            emptyLabel={t("portal.cover.results.empty")}
            entries={results}
            timeZone={calendar.timeZone}
            title={t("portal.cover.results")}
          />
          <CoverCalendarSection
            emptyLabel={t("portal.cover.upcoming.empty")}
            entries={upcoming}
            timeZone={calendar.timeZone}
            title={t("portal.cover.upcoming")}
          />
        </div>
      ) : null}
    </div>
  );
}
