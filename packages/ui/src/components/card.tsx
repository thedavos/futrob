import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";
import { typography } from "#styles/typography";

const styles = stylex.create({
  root: {
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.surface,
    color: colors.foreground,
  },
  flat: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    padding: "1.5rem",
  },
  title: {
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  description: {
    color: colors.mutedForeground,
  },
  content: {
    paddingInline: "1.5rem",
    paddingBottom: "1.5rem",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    paddingInline: "1.5rem",
    paddingBlock: "1rem",
  },
});

export type CardVariant = "flat" | "elevated";

type CardProps = React.ComponentProps<"section"> & {
  variant?: CardVariant;
};

function Card({ className, style, variant = "flat", ...props }: CardProps) {
  return (
    <section
      data-slot="card"
      data-variant={variant}
      {...applyProps(
        className,
        style,
        styles.root,
        variant === "elevated" ? elevation.sm : styles.flat,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, style, ...props }: React.ComponentProps<"header">) {
  return (
    <header data-slot="card-header" {...applyProps(className, style, styles.header)} {...props} />
  );
}

function CardTitle({ className, style, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="card-title" {...applyProps(className, style, styles.title)} {...props} />;
}

function CardDescription({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      {...applyProps(className, style, typography.caption, styles.description)}
      {...props}
    />
  );
}

function CardContent({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" {...applyProps(className, style, styles.content)} {...props} />
  );
}

function CardFooter({ className, style, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer data-slot="card-footer" {...applyProps(className, style, styles.footer)} {...props} />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
export type { CardProps };
