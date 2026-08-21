"use client";

function matchScoreWinnerSide(homeGoals: number, awayGoals: number): "home" | "away" | "draw" {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

type PitchHalfFill = "win" | "loss" | "drawHome" | "drawAway";

export function MatchPitchWash({
  awayGoals,
  awayImageUrl,
  homeGoals,
  homeImageUrl,
}: {
  readonly awayGoals: number;
  readonly awayImageUrl: string | null;
  readonly homeGoals: number;
  readonly homeImageUrl: string | null;
}) {
  const fills = pitchFillsForResult(matchScoreWinnerSide(homeGoals, awayGoals));
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <MatchPitchHalf
        className="[clip-path:polygon(0_0,58%_0,42%_100%,0_100%)]"
        fill={fills.home}
        imageUrl={homeImageUrl}
        side="home"
      />
      <MatchPitchHalf
        className="[clip-path:polygon(58%_0,100%_0,100%_100%,42%_100%)]"
        fill={fills.away}
        imageUrl={awayImageUrl}
        side="away"
      />
    </div>
  );
}

type PitchFills = {
  readonly home: PitchHalfFill;
  readonly away: PitchHalfFill;
};

function pitchFillsForResult(result: "home" | "away" | "draw"): PitchFills {
  switch (result) {
    case "home":
      return { home: "win", away: "loss" };
    case "away":
      return { home: "loss", away: "win" };
    case "draw":
      return { home: "drawHome", away: "drawAway" };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

function MatchPitchHalf({
  className,
  fill,
  imageUrl,
  side,
}: {
  readonly className: string;
  readonly fill: PitchHalfFill;
  readonly imageUrl: string | null;
  readonly side: "home" | "away";
}) {
  return (
    <div
      className={`absolute inset-0 ${pitchHalfWashClass(fill)} ${className}`}
      data-pitch-fill={fill}
      data-pitch-half={side}
    >
      {imageUrl === null ? null : (
        <img
          alt=""
          className={`absolute top-1/2 hidden size-[16.1rem] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-10 outline-none grayscale mix-blend-multiply lg:block dark:mix-blend-soft-light ${pitchWatermarkSideClass(side)}`}
          data-pitch-watermark={side}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      )}
    </div>
  );
}

function pitchWatermarkSideClass(side: "home" | "away"): string {
  switch (side) {
    case "home":
      return "left-[20%]";
    case "away":
      return "left-[80%]";
    default: {
      const _exhaustive: never = side;
      return _exhaustive;
    }
  }
}

function pitchHalfWashClass(fill: PitchHalfFill): string {
  switch (fill) {
    case "win":
      return "bg-primary/10";
    case "loss":
      return "bg-danger/10";
    case "drawHome":
      return "bg-muted";
    case "drawAway":
      return "bg-muted/50";
    default: {
      const _exhaustive: never = fill;
      return _exhaustive;
    }
  }
}
