import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";
import type { PublicCalendarEntryDto, PublicStandingRowDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Caption, Card, elevation, Score, Text, vis } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import { kickoffLabel, scoreLabel, scoreSummary } from "./public-portal-model.ts";
import { coverStyles } from "./public-portal-cover.styles.ts";

export function CoverPodiumBlock({ rows }: { readonly rows: readonly PublicStandingRowDto[] }) {
  const { locale, t } = useI18n();
  const leader = rows[0];
  if (!leader) return null;
  const chasers = rows.slice(1, 3);
  const crest = applyStyles(coverStyles.crestMd);
  const signed = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const integer = new Intl.NumberFormat(locale);
  const pointsLabel = t("portal.cover.podium.points");

  return (
    <section
      aria-label={t("portal.cover.podium")}
      {...applyStyles(coverStyles.podium, chasers.length === 0 && coverStyles.podiumSingle)}
    >
      <div {...applyStyles(coverStyles.leaderTile)}>
        <div {...applyStyles(coverStyles.leaderTop)}>
          <span aria-hidden="true" {...applyStyles(coverStyles.leaderRank)}>
            1
          </span>
          <Badge variant="approved">
            <CheckCircleIcon aria-hidden="true" {...applyStyles(coverStyles.statusIcon)} />
            {t("standings.officialBadge")}
          </Badge>
        </div>
        <div {...applyStyles(coverStyles.leaderFoot)}>
          <div {...applyStyles(coverStyles.leaderIdentity)}>
            <div {...applyStyles(coverStyles.teamRow)}>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={leader.teamName}
                style={crest.style}
              />
              <span {...applyStyles(coverStyles.leaderName)}>{leader.teamName}</span>
            </div>
            <Caption as="p">
              {`${t("portal.cover.podium.record", {
                wins: leader.wins,
                draws: leader.draws,
                losses: leader.losses,
              })} · ${t("standings.col.goalDifference")} ${signed.format(leader.goalDifference)}`}
            </Caption>
          </div>
          <div {...applyStyles(coverStyles.leaderPoints)}>
            <span {...applyStyles(coverStyles.leaderPointsValue)}>
              {integer.format(leader.points)}
            </span>
            <Caption as="span">{pointsLabel}</Caption>
          </div>
        </div>
      </div>

      {chasers.length > 0 ? (
        <ol start={2} {...applyStyles(coverStyles.chasers)}>
          {chasers.map((row) => (
            <li key={`${row.position}:${row.teamName}`} {...applyStyles(coverStyles.chaser)}>
              <span aria-hidden="true" {...applyStyles(coverStyles.chaserRank)}>
                {row.position}
              </span>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={row.teamName}
                style={crest.style}
              />
              <div {...applyStyles(coverStyles.chaserCopy)}>
                <Text weight="semibold">{row.teamName}</Text>
                <Caption as="span">
                  {`${t("portal.cover.podium.record", {
                    wins: row.wins,
                    draws: row.draws,
                    losses: row.losses,
                  })} · ${t("standings.col.goalDifference")} ${signed.format(row.goalDifference)}`}
                </Caption>
              </div>
              <span {...applyStyles(coverStyles.chaserPoints)}>{integer.format(row.points)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function CoverFeaturedMatchCard({
  entry,
  timeZone,
}: {
  readonly entry: PublicCalendarEntryDto;
  readonly timeZone: string;
}) {
  const { locale, t } = useI18n();
  const formattedScore = entry.score ? scoreLabel(entry.score) : null;
  const summary = scoreSummary(entry.score);
  const crest = applyStyles(coverStyles.crestPitch);

  const badge =
    entry.status === "official"
      ? {
          variant: "approved" as const,
          label: t("portal.cover.featured.official"),
          icon: SealCheckIcon,
        }
      : entry.status === "awaiting_result"
        ? {
            variant: "warning" as const,
            label: t("portal.cover.featured.awaiting"),
            icon: ClockIcon,
          }
        : {
            variant: "neutral" as const,
            label: t("portal.cover.featured.upcoming"),
            icon: CalendarBlankIcon,
          };
  const StatusIcon = badge.icon;

  return (
    <Card className={coverStyles.pitchCard}>
      <MatchPitchSurface
        away={{ imageUrl: null, name: entry.awayTeamName }}
        home={{ imageUrl: null, name: entry.homeTeamName }}
      >
        <div aria-hidden="true" {...applyStyles(coverStyles.pitchWash)} />
        <article
          aria-label={t("portal.cover.featured.label")}
          {...applyStyles(coverStyles.pitchBody)}
        >
          <div {...applyStyles(coverStyles.pitchTop)}>
            <Badge variant="primary">
              {t("portal.calendar.round", { round: entry.roundNumber })}
            </Badge>
            <Badge variant={badge.variant}>
              <StatusIcon aria-hidden="true" {...applyStyles(coverStyles.statusIcon)} />
              {badge.label}
            </Badge>
          </div>

          <div {...applyStyles(coverStyles.pitchMatchup)}>
            <div {...applyStyles(coverStyles.pitchSide)}>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={entry.homeTeamName}
                style={crest.style}
              />
              <Text className={coverStyles.pitchTeamName} weight="semibold">
                {entry.homeTeamName}
              </Text>
            </div>

            <div {...applyStyles(coverStyles.pitchCenter)}>
              {formattedScore && summary ? (
                <span {...applyStyles(coverStyles.pitchScorePill, elevation.md)}>
                  <Score
                    aria-label={t("portal.encounter.score", { score: formattedScore })}
                    as="span"
                  >
                    <span {...applyStyles(vis.srOnly)}>{formattedScore}</span>
                    <span aria-hidden="true">
                      <span {...applyStyles(summary.leader === "home" && coverStyles.scoreLead)}>
                        {summary.homeGoals}
                      </span>
                      <span {...applyStyles(coverStyles.scoreDash)}>–</span>
                      <span {...applyStyles(summary.leader === "away" && coverStyles.scoreLead)}>
                        {summary.awayGoals}
                      </span>
                    </span>
                  </Score>
                </span>
              ) : (
                <span aria-hidden="true" {...applyStyles(coverStyles.pitchVs)}>
                  {t("portal.encounter.versus").toUpperCase()}
                </span>
              )}
            </div>

            <div {...applyStyles(coverStyles.pitchSide)}>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={entry.awayTeamName}
                style={crest.style}
              />
              <Text className={coverStyles.pitchTeamName} weight="semibold">
                {entry.awayTeamName}
              </Text>
            </div>
          </div>

          <div {...applyStyles(coverStyles.pitchFooter)}>
            <Caption as="p">
              <time dateTime={entry.scheduledStartAt}>
                {kickoffLabel(entry.scheduledStartAt, timeZone, locale)}
              </time>
            </Caption>
          </div>
        </article>
      </MatchPitchSurface>
    </Card>
  );
}
