import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { motion } from "#styles/motion";

const styles = stylex.create({
  base: {
    borderRadius: "var(--corner-md)",
    backgroundColor: colors.muted,
  },
});

function Skeleton({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      {...applyProps(className, style, styles.base, motion.pulse)}
      {...props}
    />
  );
}

export { Skeleton };
