import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { media } from "#styles/media.stylex";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

// StyleX requires keyframes referenced inside `stylex.create` to live in the same file.
const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.5 },
});

const styles = stylex.create({
  root: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    columnGap: "0.75rem",
    rowGap: "0.5rem",
  },
  track: {
    position: "relative",
    gridColumn: "1 / -1",
    height: "0.375rem",
    width: "100%",
    overflow: "hidden",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.muted,
  },
  indicator: {
    height: "100%",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.primary,
    transitionProperty: "width",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-emphasized)",
    width: {
      default: null,
      ":is([data-indeterminate])": "33.333%",
    },
    animationName: {
      default: "none",
      ":is([data-indeterminate])": {
        default: pulse,
        [media.reduceMotion]: "none",
      },
    },
    animationDuration: {
      default: null,
      ":is([data-indeterminate])": {
        default: "2s",
        [media.reduceMotion]: "0ms",
      },
    },
    animationTimingFunction: {
      default: null,
      ":is([data-indeterminate])": "cubic-bezier(0.4, 0, 0.6, 1)",
    },
    animationIterationCount: {
      default: null,
      ":is([data-indeterminate])": "infinite",
    },
  },
  label: {
    color: colors.foreground,
  },
  value: {
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
});

function Progress({
  className,
  style,
  children,
  ...props
}: Omit<ProgressPrimitive.Root.Props, "className"> & {
  className?: HostClassName | ProgressPrimitive.Root.Props["className"];
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      {...applyProps(className, style, styles.root)}
      {...props}
    >
      {children}
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({
  className,
  style,
  ...props
}: Omit<ProgressPrimitive.Track.Props, "className"> & {
  className?: HostClassName | ProgressPrimitive.Track.Props["className"];
}) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      {...applyProps(className, style, styles.track)}
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  style,
  ...props
}: Omit<ProgressPrimitive.Indicator.Props, "className"> & {
  className?: HostClassName | ProgressPrimitive.Indicator.Props["className"];
}) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      {...applyProps(className, style, styles.indicator)}
      {...props}
    />
  );
}

function ProgressLabel({
  className,
  style,
  ...props
}: Omit<ProgressPrimitive.Label.Props, "className"> & {
  className?: HostClassName | ProgressPrimitive.Label.Props["className"];
}) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      {...applyProps(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

function ProgressValue({
  className,
  style,
  ...props
}: Omit<ProgressPrimitive.Value.Props, "className"> & {
  className?: HostClassName | ProgressPrimitive.Value.Props["className"];
}) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      {...applyProps(className, style, typography.caption, styles.value)}
      {...props}
    />
  );
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue };
