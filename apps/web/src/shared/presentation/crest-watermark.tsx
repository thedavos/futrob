import * as stylex from "@stylexjs/stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";

const styles = stylex.create({
  watermarkHome: {
    position: "absolute",
    left: "-5rem",
    bottom: "0rem",
    width: "16rem",
    height: "16rem",
    pointerEvents: "none",
    opacity: 0.11,
    filter: "grayscale(1)",
    zIndex: 0,
  },
  watermarkAway: {
    position: "absolute",
    right: "-5rem",
    top: "0rem",
    width: "16rem",
    height: "16rem",
    pointerEvents: "none",
    opacity: 0.11,
    filter: "grayscale(1)",
    zIndex: 0,
  },
});

export function CrestWatermark({
  imageUrl,
  name,
  side,
}: {
  readonly imageUrl: string | null;
  readonly name: string;
  readonly side: "home" | "away";
}) {
  return (
    <span aria-hidden="true" data-crest-watermark={side}>
      <ClubCrestAvatar
        className={side === "home" ? styles.watermarkHome : styles.watermarkAway}
        framed={false}
        imageUrl={imageUrl}
        name={name}
      />
    </span>
  );
}
