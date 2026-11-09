import * as stylex from "@stylexjs/stylex";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { applyStyles, Body, Button, Logo } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

/**
 * Where a status screen sits:
 * - `page` takes the whole viewport on its own (route or session not resolved yet).
 * - `overlay` covers content that is already mounted but must not be seen.
 * - `region` fills the content area inside the shell, which already shows the brand.
 */
export type StatusScreenPlacement = "page" | "overlay" | "region";

/** Waits this long before showing anything, so a fast check never flashes on screen. */
const REVEAL_DELAY = "400ms";

const reveal = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const breathe = stylex.keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.55 },
});

const styles = stylex.create({
  frame: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingInline: "1.25rem",
    backgroundColor: colors.background,
  },
  page: {
    minHeight: "100svh",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
  },
  region: {
    minHeight: "60svh",
    backgroundColor: "transparent",
  },
  stack: {
    display: "flex",
    maxWidth: "24rem",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    textAlign: "center",
  },
  delayed: {
    animationName: reveal,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-standard)",
    animationDelay: REVEAL_DELAY,
    // Hidden during the delay, visible after it; also when durations drop to 0 ms.
    animationFillMode: "both",
  },
  logo: {
    height: "2.5rem",
    width: "auto",
  },
  breathing: {
    animationName: {
      default: breathe,
      [media.reduceMotion]: "none",
    },
    animationDuration: "2.4s",
    animationTimingFunction: "var(--ease-standard)",
    animationIterationCount: "infinite",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
});

const placementStyles = {
  page: styles.page,
  overlay: styles.overlay,
  region: styles.region,
} as const;

/** Something is still being resolved; shows up only if it takes longer than a blink. */
export function PendingScreen({
  message,
  placement = "page",
}: Readonly<{ message: string; placement?: StatusScreenPlacement }>) {
  return (
    <div role="status" {...applyStyles(styles.frame, placementStyles[placement])}>
      <div {...applyStyles(styles.stack, styles.delayed)}>
        {placement === "region" ? null : <Logo {...applyStyles(styles.logo, styles.breathing)} />}
        <Body tone="muted">{message}</Body>
      </div>
    </div>
  );
}

/** A check that could not finish: what failed, how to fix it and a way to retry. */
export function FailedScreen({
  title,
  description,
  retryLabel,
  onRetry,
  placement = "page",
}: Readonly<{
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
  placement?: StatusScreenPlacement;
}>) {
  return (
    <div {...applyStyles(styles.frame, placementStyles[placement])}>
      <div {...applyStyles(styles.stack)}>
        {placement === "region" ? null : <Logo {...applyStyles(styles.logo)} />}
        <div role="alert" {...applyStyles(styles.copy)}>
          <Body size="lg" weight="semibold">
            {title}
          </Body>
          <Body tone="muted">{description}</Body>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <ArrowClockwiseIcon aria-hidden data-icon="inline-start" size={16} />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
