import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";

const styles = stylex.create({
  root: {
    display: "inline-flex",
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, currentColor 10%, transparent)",
    transitionProperty: "opacity, translate, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    translate: {
      default: "0 0",
      [stylex.when.ancestor(":hover")]: "0.125rem -1px",
      [stylex.when.ancestor(":active")]: "0 0",
    },
    scale: {
      default: 1,
      [stylex.when.ancestor(":hover")]: 1.05,
      [stylex.when.ancestor(":active")]: 1,
    },
  },
});

/**
 * Futrob's distinctive nested icon island for marketing CTAs.
 * Keep product controls and dense operator interfaces on plain inline icons.
 */
function ButtonIcon({
  "aria-hidden": ariaHidden = true,
  className,
  style,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden={ariaHidden}
      data-slot="button-icon"
      {...applyProps(className, style, styles.root)}
      {...props}
    />
  );
}

export { ButtonIcon };
