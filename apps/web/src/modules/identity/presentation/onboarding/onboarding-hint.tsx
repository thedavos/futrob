import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { InfoIcon } from "@phosphor-icons/react";

const styles = stylex.create({
  wrap: {
    marginTop: {
      default: "0.75rem",
      [media.sm]: "1rem",
    },
  },
  hint: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: "0.5rem",
    color: colors.mutedForeground,
  },
  icon: {
    marginTop: "0.125rem",
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
});

export function OnboardingHint({ children }: Readonly<{ children: ReactNode }>) {
  const icon = applyStyles(styles.icon);
  return (
    <div {...applyStyles(styles.wrap)}>
      <p {...applyStyles(typography.caption, styles.hint)}>
        <InfoIcon aria-hidden="true" className={icon.className} style={icon.style} />
        <span>{children}</span>
      </p>
    </div>
  );
}
