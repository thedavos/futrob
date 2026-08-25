import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { media } from "#styles/media.stylex";
import { typography } from "#styles/typography";

import { Eyebrow } from "../eyebrow/index.ts";
import { Subtitle } from "../subtitle/index.ts";

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
  },
  title: {
    gridColumnStart: 1,
    textWrap: "balance",
  },
  titleLg: {
    fontSize: {
      default: "var(--text-3xl)",
      [media.sm]: "var(--text-4xl)",
    },
  },
  description: {
    gridColumnStart: 1,
    maxWidth: "42rem",
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

function PageHeader({ className, style, ...props }: ComponentProps<"header">) {
  return (
    <header data-slot="page-header" {...applyProps(className, style, styles.root)} {...props} />
  );
}

function PageHeaderEyebrow({ className, style, ...props }: ComponentProps<"p">) {
  return (
    <Eyebrow
      data-slot="page-header-eyebrow"
      {...applyProps(className, style, styles.eyebrow)}
      {...props}
    />
  );
}

export type PageHeaderTitleSize = "default" | "lg";

function PageHeaderTitle({
  className,
  style,
  size = "default",
  truncate = false,
  title,
  children,
  ...props
}: ComponentProps<"h1"> & { size?: PageHeaderTitleSize; truncate?: boolean }) {
  return (
    <h1
      data-slot="page-header-title"
      data-size={size}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.heading,
        styles.title,
        size === "lg" && styles.titleLg,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

function PageHeaderDescription({ className, style, ...props }: ComponentProps<"p">) {
  return (
    <Subtitle
      data-slot="page-header-description"
      {...applyProps(className, style, styles.description)}
      {...props}
    />
  );
}

function PageHeaderActions({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-actions"
      {...applyProps(className, style, styles.actions)}
      {...props}
    />
  );
}

export { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle };
