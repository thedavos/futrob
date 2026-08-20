"use client";

import type { PlayerRecentProviderMatchDetailDto } from "@futrob/api-contracts";
import { Badge, Card, CardContent, CardHeader } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { MATCH_TYPE_KEYS } from "./player-match-copy.ts";
import { providerMatchMode } from "./player-match-view.ts";

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
      <CardHeader className="px-5 py-4">
        <h2 className="typo-subtitle font-semibold">{t("player.matchDetail.tab.facts")}</h2>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
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
          <div className="mt-5 flex flex-wrap gap-2">
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
    <div className="min-w-0">
      <dt className="typo-caption text-muted-foreground">{label}</dt>
      <dd className="typo-caption mt-0.5 font-semibold">{value}</dd>
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
    <div className="min-w-0">
      <dt className="typo-caption text-muted-foreground">{label}</dt>
      <dd
        className="typo-caption mt-0.5 font-semibold"
        {...(durationSeconds === null ? {} : { "data-match-duration": durationSeconds })}
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
