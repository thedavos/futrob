import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";
import { vis } from "#styles/sr-only";

const styles = stylex.create({
  list: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: {
      default: "0.375rem",
      [media.sm]: "0.5rem",
    },
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  item: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  link: {
    borderRadius: "var(--corner-sm)",
    color: {
      default: colors.mutedForeground,
      ":hover": colors.foreground,
    },
    transitionProperty: "color",
    transitionDuration: "var(--duration-normal)",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  page: {
    fontWeight: 500,
    color: colors.foreground,
  },
  ellipsis: {
    display: "flex",
    width: "2rem",
    height: "2rem",
    alignItems: "center",
    justifyContent: "center",
  },
  ellipsisIcon: {
    width: "1rem",
    height: "1rem",
  },
});

function Breadcrumb(props: React.ComponentProps<"nav">) {
  return <nav aria-label="Migas de pan" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, style, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol data-slot="breadcrumb-list" {...applyProps(className, style, styles.list)} {...props} />
  );
}

function BreadcrumbItem({ className, style, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-item" {...applyProps(className, style, styles.item)} {...props} />
  );
}

function BreadcrumbLink({ className, style, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: {
      ...props,
      ...applyProps(className, style, styles.link),
      "data-slot": "breadcrumb-link",
    },
    render,
  });
}

function BreadcrumbPage({ className, style, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      data-slot="breadcrumb-page"
      {...applyProps(className, style, styles.page)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, style, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      role="presentation"
      {...applyProps(className, style)}
      {...props}
    >
      {children ?? <CaretRightIcon />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, style, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      {...applyProps(className, style, styles.ellipsis)}
      {...props}
    >
      <DotsThreeIcon {...applyProps(undefined, undefined, styles.ellipsisIcon)} />
      <span {...applyProps(undefined, undefined, vis.srOnly)}>Más</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
