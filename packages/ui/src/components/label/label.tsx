import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  base: {
    display: "flex",
    cursor: "pointer",
    alignItems: "center",
    gap: "0.5rem",
    color: colors.foreground,
    userSelect: "none",
  },
});

export type LabelProps = ComponentProps<"label">;

function Label({ className, style, ...props }: LabelProps) {
  return (
    // Consumers must pass `htmlFor` or wrap an associated control.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- primitive forwards label semantics via props
    <label
      data-slot="label"
      {...applyProps(className, style, typography.host, typography.label, styles.base)}
      {...props}
    />
  );
}

export { Label };
