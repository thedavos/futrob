import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
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
    // Narrow (touch) layouts give the link the 44px touch target of every other control.
    display: { default: null, [media.maxSm]: "inline-flex" },
    alignItems: { default: null, [media.maxSm]: "center" },
    minHeight: { default: null, [media.maxSm]: "var(--control-height-touch)" },
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

function Breadcrumb({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"nav">, "className"> & { className?: HostClassName }) {
  return (
    <nav
      aria-label="Migas de pan"
      data-slot="breadcrumb"
      {...applyProps(className, style)}
      {...props}
    />
  );
}

function BreadcrumbList({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"ol">, "className"> & { className?: HostClassName }) {
  return (
    <ol data-slot="breadcrumb-list" {...applyProps(className, style, styles.list)} {...props} />
  );
}

function BreadcrumbItem({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"li">, "className"> & { className?: HostClassName }) {
  return (
    <li data-slot="breadcrumb-item" {...applyProps(className, style, styles.item)} {...props} />
  );
}

function BreadcrumbLink({
  className,
  style,
  render,
  ...props
}: Omit<useRender.ComponentProps<"a">, "className"> & { className?: HostClassName }) {
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

function BreadcrumbPage({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"span">, "className"> & { className?: HostClassName }) {
  return (
    <span
      aria-current="page"
      data-slot="breadcrumb-page"
      {...applyProps(className, style, styles.page)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"li">, "className"> & { className?: HostClassName }) {
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

function BreadcrumbEllipsis({
  className,
  label = "Más",
  style,
  ...props
}: Omit<React.ComponentProps<"span">, "className"> & {
  className?: HostClassName;
  /** Accessible label for the collapsed breadcrumb segment in the active locale. */
  label?: string;
}) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      {...applyProps(className, style, styles.ellipsis)}
      {...props}
    >
      <DotsThreeIcon
        aria-hidden="true"
        {...applyProps(undefined, undefined, styles.ellipsisIcon)}
      />
      <span {...applyProps(undefined, undefined, vis.srOnly)}>{label}</span>
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
