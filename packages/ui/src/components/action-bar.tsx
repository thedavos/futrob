import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.5rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
  },
  start: {
    marginRight: "auto",
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  end: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
});

function ActionBar({ className, style, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="action-bar" {...applyProps(className, style, styles.root)} {...props} />;
}

function ActionBarStart({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="action-bar-start" {...applyProps(className, style, styles.start)} {...props} />
  );
}

function ActionBarEnd({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="action-bar-end" {...applyProps(className, style, styles.end)} {...props} />
  );
}

export { ActionBar, ActionBarEnd, ActionBarStart };
