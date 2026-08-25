import * as React from "react";
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

function Label({ className, style, ...props }: React.ComponentProps<"label">) {
  return (
    // Consumers must pass `htmlFor` or wrap an associated control.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- primitive forwards label semantics via props
    <label
      data-slot="label"
      {...applyProps(className, style, typography.label, styles.base)}
      {...props}
    />
  );
}

export { Label };
