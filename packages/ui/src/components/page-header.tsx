import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  root: {
    marginBottom: "2rem",
    display: "grid",
    gridTemplateColumns: "1fr",
    alignItems: "start",
    columnGap: "1rem",
    rowGap: "0.5rem",
  },
  eyebrow: {
    gridColumnStart: 1,
    color: colors.mutedForeground,
  },
  title: {
    gridColumnStart: 1,
    textWrap: "balance",
  },
  description: {
    gridColumnStart: 1,
    maxWidth: "42rem",
    color: colors.mutedForeground,
  },
  actions: {
    gridColumnStart: 2,
    gridRowStart: 1,
    gridRowEnd: "span 3",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.5rem",
    alignSelf: "start",
  },
});

function PageHeader({ className, style, ...props }: React.ComponentProps<"header">) {
  return (
    <header data-slot="page-header" {...applyHost(className, style, styles.root)} {...props} />
  );
}

function PageHeaderEyebrow({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-eyebrow"
      {...applyHost(className, style, typography.label, styles.eyebrow)}
      {...props}
    />
  );
}

function PageHeaderTitle({ className, style, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-header-title"
      {...applyHost(className, style, typography.heading, styles.title)}
      {...props}
    />
  );
}

function PageHeaderDescription({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-description"
      {...applyHost(className, style, typography.subtitle, styles.description)}
      {...props}
    />
  );
}

function PageHeaderActions({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-actions"
      {...applyHost(className, style, styles.actions)}
      {...props}
    />
  );
}

export { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle };
