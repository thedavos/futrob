"use client";

import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { FORM_OUTCOME_SHORT_KEYS, FORM_SEGMENT_TOOLTIP_KEYS } from "./player-match-copy.ts";
import { FORM_RESULT_FILL_CLASS, FORM_SEGMENT_CLASS } from "./player-match-tone.ts";
import {
  formTimeline,
  lastFormGames,
  matchOutcome,
  opponentClubName,
  playerMatchSide,
} from "./player-match-view.ts";

export function RecentForm({
  matches,
}: {
  readonly matches: readonly PlayerRecentProviderMatchDto[];
}) {
  const { t } = useI18n();
  const timeline = formTimeline(matches);
  const lastGames = lastFormGames(matches);

  return (
    <div
      aria-labelledby="player-matches-form-heading"
      className="flex flex-col gap-2"
      data-recent-form=""
      role="group"
    >
      <div
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface"
        data-recent-form-bar=""
      >
        {timeline.map((item) => (
          <FormSegment item={item} key={item.match.id} />
        ))}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p
          className="typo-caption font-medium min-w-0 text-muted-foreground"
          id="player-matches-form-heading"
        >
          {t("player.matches.form.label")}
        </p>
        <ol className="flex shrink-0 flex-wrap gap-1" data-last-games="">
          {lastGames.map((item) => (
            <FormResultMark item={item} key={item.match.id} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function FormSegment({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n();
  const outcome = matchOutcome(item);
  const label = formSegmentLabel(item, t);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            className={`min-w-0 flex-1 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${FORM_SEGMENT_CLASS[outcome]}`}
            data-form-segment={outcome}
            type="button"
          />
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FormResultMark({ item }: { readonly item: PlayerRecentProviderMatchDto }) {
  const { t } = useI18n();
  const outcome = matchOutcome(item);
  const label = formSegmentLabel(item, t);

  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={label}
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md typo-label ${FORM_RESULT_FILL_CLASS[outcome]}`}
              data-last-game={item.match.id}
              data-last-game-outcome={outcome}
              type="button"
            />
          }
        >
          <span aria-hidden="true">{t(FORM_OUTCOME_SHORT_KEYS[outcome])}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

function formSegmentLabel(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const outcome = matchOutcome(item);
  const opponent = opponentClubName(item);
  if (outcome === "unknown" || opponent === null) {
    return t("player.matches.form.unknownMatch", {
      home: item.match.home.name,
      away: item.match.away.name,
      score: `${item.match.home.goals} ${t("player.matches.vs")} ${item.match.away.goals}`,
    });
  }
  return t(FORM_SEGMENT_TOOLTIP_KEYS[outcome], {
    score: listedScoreline(item, t),
    opponent,
  });
}

function listedScoreline(item: PlayerRecentProviderMatchDto, t: Translator): string {
  const side = playerMatchSide(item);
  const scored = side === "away" ? item.match.away.goals : item.match.home.goals;
  const conceded = side === "away" ? item.match.home.goals : item.match.away.goals;
  return `${scored} ${t("player.matches.vs")} ${conceded}`;
}
