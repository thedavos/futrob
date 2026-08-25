"use client"

import { applyStyles } from "@futrob/ui"

import { styles } from "./player-match-pitch.styles"

function matchScoreWinnerSide(homeGoals: number, awayGoals: number): "home" | "away" | "draw" {
  if (homeGoals > awayGoals) return "home"
  if (awayGoals > homeGoals) return "away"
  return "draw"
}

type PitchHalfFill = "win" | "loss" | "drawHome" | "drawAway"

export function MatchPitchWash({
  awayGoals,
  awayImageUrl,
  homeGoals,
  homeImageUrl,
}: {
  readonly awayGoals: number
  readonly awayImageUrl: string | null
  readonly homeGoals: number
  readonly homeImageUrl: string | null
}) {
  const fills = pitchFillsForResult(matchScoreWinnerSide(homeGoals, awayGoals))
  return (
    <div aria-hidden="true" {...applyStyles(styles.root)}>
      <MatchPitchHalf fill={fills.home} imageUrl={homeImageUrl} side="home" />
      <MatchPitchHalf fill={fills.away} imageUrl={awayImageUrl} side="away" />
    </div>
  )
}

type PitchFills = {
  readonly home: PitchHalfFill
  readonly away: PitchHalfFill
}

function pitchFillsForResult(result: "home" | "away" | "draw"): PitchFills {
  switch (result) {
    case "home":
      return { home: "win", away: "loss" }
    case "away":
      return { home: "loss", away: "win" }
    case "draw":
      return { home: "drawHome", away: "drawAway" }
    default: {
      const _exhaustive: never = result
      return _exhaustive
    }
  }
}

function pitchHalfWash(fill: PitchHalfFill) {
  switch (fill) {
    case "win":
      return styles.washWin
    case "loss":
      return styles.washLoss
    case "drawHome":
      return styles.washDrawHome
    case "drawAway":
      return styles.washDrawAway
    default: {
      const _exhaustive: never = fill
      return _exhaustive
    }
  }
}

function MatchPitchHalf({
  fill,
  imageUrl,
  side,
}: {
  readonly fill: PitchHalfFill
  readonly imageUrl: string | null
  readonly side: "home" | "away"
}) {
  return (
    <div
      data-pitch-fill={fill}
      data-pitch-half={side}
      {...applyStyles(
        styles.half,
        side === "home" ? styles.halfHome : styles.halfAway,
        pitchHalfWash(fill),
      )}
    >
      {imageUrl === null ? null : (
        <img
          alt=""
          data-pitch-watermark={side}
          referrerPolicy="no-referrer"
          src={imageUrl}
          {...applyStyles(
            styles.watermark,
            side === "home" ? styles.watermarkHome : styles.watermarkAway,
          )}
        />
      )}
    </div>
  )
}
