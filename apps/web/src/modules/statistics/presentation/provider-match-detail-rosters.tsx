"use client";

import { useId } from "react";
import {
  applyProps,
  applyStyles,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  providerPositionCopy,
  type ProviderMatchRosterModel,
  type ProviderPlayer,
  type ProviderRosterPlayer,
  type ProviderRosterSection,
  type ProviderTeam,
} from "./provider-match-detail-model.ts";
import {
  ROSTER_COLUMNS,
  ROSTER_PLAYER_BADGE_LABEL_KEYS,
  formatKnownNumber,
  isRosterWinner,
  matchRosterAwards,
  ratingBadgeVariant,
  ratingTone,
  ratioLabel,
  rosterPlayerBadges,
  type MatchRosterAwards,
  type RosterColumn,
} from "./provider-match-detail-roster-view.ts";
import { rosterTypography, styles } from "./provider-match-detail-rosters.styles.ts";

const EXCELLENT_RATING_STYLE = {
  borderColor: "var(--primary)",
  backgroundColor: "var(--primary)",
  color: "var(--primary-foreground)",
} as const;

export function MatchRosters({
  numberFormat,
  sides,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly sides: ProviderMatchRosterModel;
  readonly t: Translator;
}) {
  const headingId = useId();
  const awards = matchRosterAwards(sides);
  const registered = sides.selected.players.length + sides.opponent.players.length;

  return (
    <section aria-labelledby={headingId} data-match-rosters="" {...applyStyles(styles.section)}>
      <header {...applyStyles(styles.intro)}>
        <h2 id={headingId} {...applyStyles(rosterTypography.label)}>
          {t("player.matchDetail.rosters")}
        </h2>
        <p {...applyStyles(rosterTypography.caption, styles.subtitle)}>
          {t("player.matchDetail.rosters.registered", { count: registered })}
        </p>
      </header>
      <div {...applyStyles(styles.tables)}>
        <RosterTable
          awards={awards}
          kind="selected"
          numberFormat={numberFormat}
          opponent={sides.opponent.team}
          section={sides.selected}
          t={t}
        />
        <RosterTable
          awards={awards}
          kind="opponent"
          numberFormat={numberFormat}
          opponent={sides.selected.team}
          section={sides.opponent}
          t={t}
        />
      </div>
    </section>
  );
}

function RosterTable({
  awards,
  kind,
  numberFormat,
  opponent,
  section,
  t,
}: {
  readonly awards: MatchRosterAwards;
  readonly kind: "selected" | "opponent";
  readonly numberFormat: Intl.NumberFormat;
  readonly opponent: ProviderTeam;
  readonly section: ProviderRosterSection;
  readonly t: Translator;
}) {
  const headingId = useId();
  const crest = applyStyles(styles.crest);

  return (
    <article aria-labelledby={headingId} data-roster={kind} {...applyStyles(styles.table)}>
      <header {...applyStyles(styles.clubHeader)}>
        <ClubCrestAvatar
          className={crest.className}
          framed={false}
          imageUrl={section.team.imageUrl}
          name={section.team.name}
          style={crest.style}
        />
        <h3 id={headingId} {...applyStyles(rosterTypography.subtitle, styles.teamName)}>
          {section.team.name}
        </h3>
        {isRosterWinner(section.team, opponent) ? (
          <Badge data-team-winner="" variant="primary" {...applyStyles(styles.winner)}>
            {t("player.matchDetail.rosters.winner")}
          </Badge>
        ) : null}
        <p {...applyStyles(rosterTypography.caption, styles.playerCount)}>
          {t("player.matchDetail.rosters.playerCount", { count: section.players.length })}
        </p>
      </header>
      <Table containerClassName={styles.tableContainer} dense>
        <TableHeader>
          <TableRow>
            {ROSTER_COLUMNS.map((column) => (
              <ColumnHead column={column} key={column.key} t={t} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.players.length === 0 ? (
            <TableRow>
              <TableEmpty colSpan={ROSTER_COLUMNS.length}>
                {t("player.matchDetail.roster.empty")}
              </TableEmpty>
            </TableRow>
          ) : (
            section.players.map((entry) => (
              <RosterPlayerRow
                awards={awards}
                entry={entry}
                key={`${entry.player.externalClubId}:${entry.player.externalPlayerId}`}
                numberFormat={numberFormat}
                t={t}
              />
            ))
          )}
        </TableBody>
      </Table>
    </article>
  );
}

function ColumnHead({ column, t }: { readonly column: RosterColumn; readonly t: Translator }) {
  const label = t(column.labelKey);
  const title = "abbrTitleKey" in column ? t(column.abbrTitleKey) : undefined;
  return (
    <TableHead {...applyProps(undefined, undefined, column.align === "end" && styles.numeric)}>
      {title && title !== label ? <abbr title={title}>{label}</abbr> : label}
    </TableHead>
  );
}

function RosterPlayerRow({
  awards,
  entry,
  numberFormat,
  t,
}: {
  readonly awards: MatchRosterAwards;
  readonly entry: ProviderRosterPlayer;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <TableRow
      data-personal-player={entry.isPersonal ? "" : undefined}
      data-player-name={entry.player.displayName}
      data-roster-player=""
    >
      {ROSTER_COLUMNS.map((column) => (
        <RosterPlayerCell
          awards={awards}
          column={column}
          entry={entry}
          key={column.key}
          numberFormat={numberFormat}
          t={t}
        />
      ))}
    </TableRow>
  );
}

function RosterPlayerCell({
  awards,
  column,
  entry,
  numberFormat,
  t,
}: {
  readonly awards: MatchRosterAwards;
  readonly column: RosterColumn;
  readonly entry: ProviderRosterPlayer;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const numeric = applyStyles(styles.numeric);
  switch (column.key) {
    case "player":
      return (
        <TableCell>
          <PlayerName entry={entry} awards={awards} t={t} />
        </TableCell>
      );
    case "position":
      return (
        <TableCell data-player-metric="position" {...applyStyles(styles.position)}>
          <PositionValue player={entry.player} t={t} />
        </TableCell>
      );
    case "rating":
      return (
        <TableCell {...numeric}>
          <RatingBadge numberFormat={numberFormat} rating={entry.player.rating} />
        </TableCell>
      );
    case "goals":
      return (
        <TableCell data-player-metric="goals" {...numeric}>
          {formatKnownNumber(entry.player.goals, numberFormat)}
        </TableCell>
      );
    case "assists":
      return (
        <TableCell data-player-metric="assists" {...numeric}>
          {formatKnownNumber(entry.player.assists, numberFormat)}
        </TableCell>
      );
    case "shots":
      return (
        <TableCell data-player-metric="shots" {...numeric}>
          {formatKnownNumber(entry.player.shots, numberFormat)}
        </TableCell>
      );
    case "passes":
      return (
        <TableCell data-player-metric="passes" {...numeric}>
          {ratioLabel(entry.player.passesMade, entry.player.passAttempts, numberFormat)}
        </TableCell>
      );
    case "tackles":
      return (
        <TableCell data-player-metric="tackles" {...numeric}>
          {ratioLabel(entry.player.tacklesMade, entry.player.tackleAttempts, numberFormat)}
        </TableCell>
      );
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}

function PlayerName({
  awards,
  entry,
  t,
}: {
  readonly awards: MatchRosterAwards;
  readonly entry: ProviderRosterPlayer;
  readonly t: Translator;
}) {
  const badges = rosterPlayerBadges(entry, awards);
  return (
    <div {...applyStyles(styles.playerCell)}>
      <span {...applyStyles(styles.playerName)}>{entry.player.displayName}</span>
      {badges.length > 0 ? (
        <span {...applyStyles(styles.badges)}>
          {badges.map((badge) => (
            <Badge data-roster-badge={badge} key={badge} variant="outline">
              {t(ROSTER_PLAYER_BADGE_LABEL_KEYS[badge])}
            </Badge>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function RatingBadge({
  numberFormat,
  rating,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly rating: number | null;
}) {
  const tone = ratingTone(rating);
  return (
    <Badge
      data-rating-tone={tone}
      style={tone === "excellent" ? EXCELLENT_RATING_STYLE : undefined}
      variant={ratingBadgeVariant(tone)}
    >
      <span data-player-metric="rating">{formatKnownNumber(rating, numberFormat)}</span>
    </Badge>
  );
}

function PositionValue({ player, t }: { readonly player: ProviderPlayer; readonly t: Translator }) {
  if (player.position === null) return "—";
  const copy = providerPositionCopy(player.position);
  const short = copy ? t(copy.short) : player.position;
  const full = copy ? t(copy.full) : player.position;
  if (full !== short) {
    return <abbr title={full}>{short}</abbr>;
  }
  return short;
}
