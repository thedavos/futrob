import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, type StyleXStyles } from "@futrob/ui";
import backgroundMatchUrl from "@/assets/background-match.png";
import { CrestWatermark } from "@/shared/presentation/crest-watermark.tsx";

const styles = stylex.create({
  root: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    alignSelf: "stretch",
    width: "100%",
    minHeight: "min-content",
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    zIndex: 0,
  },
});

export function MatchPitchSurface({
  away,
  children,
  className,
  home,
}: {
  readonly away: { readonly imageUrl: string | null; readonly name: string };
  readonly children: ReactNode;
  readonly className?: StyleXStyles;
  readonly home: { readonly imageUrl: string | null; readonly name: string };
}) {
  return (
    <div {...applyStyles(styles.root, className)}>
      <img
        alt=""
        aria-hidden="true"
        data-match-backdrop=""
        data-outline="none"
        src={backgroundMatchUrl}
        {...applyStyles(styles.backdrop)}
      />
      <CrestWatermark imageUrl={home.imageUrl} name={home.name} side="home" />
      <CrestWatermark imageUrl={away.imageUrl} name={away.name} side="away" />
      {children}
    </div>
  );
}
