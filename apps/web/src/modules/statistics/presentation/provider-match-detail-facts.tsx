"use client";

import type { PlayerRecentProviderMatchDetailDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Card, CardContent, CardHeader, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MATCH_TYPE_KEYS } from "./player-match-copy.ts";
import { providerMatchMode } from "./player-match-view.ts";

const styles = stylex.create({
  header: {
    paddingInline: "1.25rem",
    paddingBlock: "1rem",
  },
  title: {
    fontWeight: 600,
  },
  content: {
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  list: {
    display: "grid",
    columnGap: "1.5rem",
    rowGap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  flags: {
    marginTop: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  fact: {
    minWidth: 0,
  },
  label: {
    color: colors.mutedForeground,
  },
  value: {
    marginTop: "0.125rem",
    fontWeight: 600,
  },
});

export function MatchFacts({
  detail,
  t,
}: {
  readonly detail: PlayerRecentProviderMatchDetailDto;
  readonly t: Translator;
}) {
  const mode = providerMatchMode(detail);
  const durationSeconds = detail.match.metadata.durationSeconds;
  const duration = matchDurationLabel(durationSeconds, t);
  return (
    <Card data-match-facts="">
      <CardHeader className={styles.header}>
        <h2 {...applyStyles(typography.subtitle, styles.title)}>
          {t("player.matchDetail.tab.facts")}
        </h2>
      </CardHeader>
      <CardContent className={styles.content}>
        <dl {...applyStyles(styles.list)}>
          <Fact
            label={t("player.matchDetail.facts.type")}
            value={mode ? t(MATCH_TYPE_KEYS[mode]) : t("player.noData")}
          />
          <Fact
            label={t("player.matchDetail.facts.completeness")}
            value={completenessLabel(detail.match.metadata.completeness, t)}
          />
          <DurationFact
            durationSeconds={durationSeconds}
            label={t("player.matchDetail.facts.duration")}
            value={duration ?? t("player.noData")}
          />
          <Fact
            label={t("player.matchDetail.facts.game")}
            value={t("player.matchDetail.game", {
              edition: detail.match.game.edition,
              platform: detail.match.game.platform,
            })}
          />
          <Fact
            label={t("player.matchDetail.facts.provider")}
            value={t("player.matchDetail.provider", { provider: detail.match.provider.key })}
          />
        </dl>
        {detail.match.metadata.wasDisconnected || detail.match.metadata.winnerByForfeit ? (
          <div {...applyStyles(styles.flags)}>
            {detail.match.metadata.wasDisconnected ? (
              <Badge variant="outline">{t("player.matchDetail.disconnected")}</Badge>
            ) : null}
            {detail.match.metadata.winnerByForfeit ? (
              <Badge variant="outline">{t("player.matchDetail.forfeit")}</Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div {...applyStyles(styles.fact)}>
      <dt {...applyStyles(typography.caption, styles.label)}>{label}</dt>
      <dd {...applyStyles(typography.caption, styles.value)}>{value}</dd>
    </div>
  );
}

function DurationFact({
  durationSeconds,
  label,
  value,
}: {
  readonly durationSeconds: number | null;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div {...applyStyles(styles.fact)}>
      <dt {...applyStyles(typography.caption, styles.label)}>{label}</dt>
      <dd
        {...(durationSeconds === null ? {} : { "data-match-duration": durationSeconds })}
        {...applyStyles(typography.caption, styles.value)}
      >
        {value}
      </dd>
    </div>
  );
}

function matchDurationLabel(durationSeconds: number | null, t: Translator): string | null {
  if (durationSeconds === null || durationSeconds < 0) return null;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  if (minutes === 0) return t("player.matchDetail.duration.seconds", { seconds });
  if (seconds === 0) return t("player.matchDetail.duration.minutes", { minutes });
  return t("player.matchDetail.duration.minutesSeconds", { minutes, seconds });
}

function completenessLabel(
  completeness: PlayerRecentProviderMatchDetailDto["match"]["metadata"]["completeness"],
  t: Translator,
): string {
  switch (completeness) {
    case "complete":
      return t("player.matchDetail.complete");
    case "partial":
      return t("player.matchDetail.partial");
    case "unknown":
      return t("player.matchDetail.unknown");
    default: {
      const _exhaustive: never = completeness;
      return _exhaustive;
    }
  }
}
