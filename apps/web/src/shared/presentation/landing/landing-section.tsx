"use client";

import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, Display } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";

export type LandingSectionTone = "base" | "band";
export type LandingSectionAlign = "center" | "start";
export type LandingSectionLayout = "split" | "stacked";

export interface LandingSectionProps {
  /** `h1` is the page hero: it fills the remaining first viewport and uses tighter padding. */
  readonly as?: "h1" | "h2";
  /** `start` keeps the copy in view while a taller visual column scrolls. */
  readonly align?: LandingSectionAlign;
  /** Visual column. Without it, the section is a single column of copy. */
  readonly children?: ReactNode;
  /** Extra copy-column content below the subtitle: lists, notes or `LandingActions`. */
  readonly copy?: ReactNode;
  readonly id?: string;
  /** `stacked` gives the visual the full container width below the copy, for card grids. */
  readonly layout?: LandingSectionLayout;
  readonly subtitle: string;
  readonly title: string;
  /** Sections alternate `base` and `band`; the tone change is the only separator. */
  readonly tone?: LandingSectionTone;
}

const styles = stylex.create({
  band: {
    backgroundColor: colors.sidebar,
  },
  hero: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    justifyContent: "center",
  },
  inner: {
    marginInline: "auto",
    width: "100%",
    maxWidth: "80rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "7rem",
    },
  },
  innerHero: {
    paddingBlock: {
      default: "2rem",
      [media.lg]: "3rem",
    },
  },
  split: {
    display: "grid",
    alignItems: "center",
    gap: {
      default: space.s12,
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 5fr) minmax(0, 6fr)",
    },
  },
  splitStart: {
    alignItems: "start",
  },
  stacked: {
    display: "flex",
    flexDirection: "column",
    gap: space.s12,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: space.s6,
  },
  copySingle: {
    maxWidth: "40rem",
  },
  copySticky: {
    position: {
      default: "static",
      [media.lg]: "sticky",
    },
    top: "2rem",
  },
  title: {
    minWidth: 0,
    overflowWrap: "break-word",
  },
  subtitle: {
    maxWidth: "44ch",
  },
  visual: {
    minWidth: 0,
  },
  actions: {
    marginTop: space.s2,
    display: "flex",
    flexWrap: "wrap",
    gap: space.s3,
  },
});

/** Shared skeleton of every landing section: container, rhythm, columns and copy hierarchy. */
export function LandingSection({
  as = "h2",
  align = "center",
  children,
  copy,
  id,
  layout = "split",
  subtitle,
  title,
  tone = "base",
}: LandingSectionProps) {
  const isHero = as === "h1";
  const hasVisual = children !== undefined;
  const isSplit = hasVisual && layout === "split";
  const isStacked = hasVisual && layout === "stacked";
  return (
    <section id={id} {...applyStyles(tone === "band" && styles.band, isHero && styles.hero)}>
      <div
        {...applyStyles(
          styles.inner,
          isHero && styles.innerHero,
          isSplit && styles.split,
          isStacked && styles.stacked,
          isSplit && align === "start" && styles.splitStart,
        )}
      >
        <div
          {...applyStyles(
            styles.copy,
            !isSplit && styles.copySingle,
            isSplit && align === "start" && styles.copySticky,
          )}
        >
          <Display as={as} {...applyStyles(styles.title)}>
            {title}
          </Display>
          <Body size="lg" tone="muted" {...applyStyles(styles.subtitle)}>
            {subtitle}
          </Body>
          {copy}
        </div>
        {hasVisual ? <div {...applyStyles(styles.visual)}>{children}</div> : null}
      </div>
    </section>
  );
}

/** CTA row of a section's copy column. */
export function LandingActions({ children }: { readonly children: ReactNode }) {
  return <div {...applyStyles(styles.actions)}>{children}</div>;
}
