import type { CompetitionCoverDto, CompetitionCoverPresetDto } from "@futrob/api-contracts";
import trophyAmistososUrl from "@/assets/trophy-amistosos.png";
import trophyCupUrl from "@/assets/trophy-cup.png";
import trophyGroupsUrl from "@/assets/trophy-groups.png";
import trophyLeagueUrl from "@/assets/trophy-league.png";
import trophyLightningUrl from "@/assets/trophy-lightning.png";
import trophyPlayoffsUrl from "@/assets/trophy-playoffs.png";
import trophyPreSeasonUrl from "@/assets/trophy-pre-season.png";
import trophySupercupUrl from "@/assets/trophy-supercup.png";
import trophyUrl from "@/assets/trophy.png";

/** Preset id → bundled `trophy-*` illustration, in picker order. */
export const COMPETITION_COVER_ASSETS = {
  cup: { src: trophyCupUrl, label: "Copa" },
  league: { src: trophyLeagueUrl, label: "Liga" },
  groups: { src: trophyGroupsUrl, label: "Grupos" },
  playoffs: { src: trophyPlayoffsUrl, label: "Playoffs" },
  supercup: { src: trophySupercupUrl, label: "Supercopa" },
  lightning: { src: trophyLightningUrl, label: "Relámpago" },
  "pre-season": { src: trophyPreSeasonUrl, label: "Pretemporada" },
  friendlies: { src: trophyAmistososUrl, label: "Amistosos" },
  classic: { src: trophyUrl, label: "Clásico" },
} as const satisfies Record<
  CompetitionCoverPresetDto,
  { readonly src: string; readonly label: string }
>;

/** Picker order: the default first, then the formats organizers reach for most. */
export const COMPETITION_COVER_PICKER_ORDER = [
  "cup",
  "league",
  "groups",
  "playoffs",
  "supercup",
  "lightning",
  "pre-season",
  "friendlies",
  "classic",
] as const satisfies readonly CompetitionCoverPresetDto[];

export function competitionCoverSrc(cover: CompetitionCoverDto): string {
  return cover.kind === "preset"
    ? COMPETITION_COVER_ASSETS[cover.preset].src
    : `/media/${cover.key}`;
}
