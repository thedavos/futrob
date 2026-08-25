"use client";

import { useState, type CSSProperties } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";

const styles = stylex.create({
  root: {
    position: "relative",
    display: "flex",
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  framed: {
    overflow: "hidden",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.muted,
  },
  unframed: {
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  imageUnframed: {
    outlineWidth: 0,
    outlineStyle: "none",
  },
  fallback: {
    display: "flex",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.625rem",
    lineHeight: 1,
    fontWeight: 500,
  },
});

export function ClubCrestAvatar({
  name,
  imageUrl,
  className,
  style,
  fallbackClassName,
  framed = true,
}: {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly fallbackClassName?: string;
  readonly framed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <span
      aria-hidden="true"
      data-slot="club-crest-avatar"
      {...applyHost(className, style, styles.root, framed ? styles.framed : styles.unframed)}
    >
      {showImage ? (
        <img
          alt=""
          data-slot="club-crest-image"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={imageUrl!}
          {...applyStyles(styles.image, !framed && styles.imageUnframed)}
        />
      ) : (
        <span {...applyHost(fallbackClassName, undefined, styles.fallback)}>
          {initialsFromName(name)}
        </span>
      )}
    </span>
  );
}
