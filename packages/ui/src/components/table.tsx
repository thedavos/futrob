import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

type TableProps = Omit<React.ComponentProps<"table">, "className"> & {
  className?: HostClassName;
  /** Reduces row height to 36px on desktop. Touch layouts remain comfortable. */
  dense?: boolean;
  containerClassName?: HostClassName;
  /** Accessible name for the horizontally scrollable container. */
  containerLabelledBy?: string;
  /**
   * Keeps the header row visible while the rows scroll. The container becomes the vertical
   * scroller, so give it a height limit through `containerClassName` (for example `maxHeight`).
   */
  stickyHeader?: boolean;
};

/** `end` is for figures: it right-aligns, keeps tabular digits and never wraps. */
export type TableAlign = "start" | "center" | "end";

const styles = stylex.create({
  container: {
    position: "relative",
    width: "100%",
    overflowX: "auto",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  table: {
    width: "100%",
    captionSide: "bottom",
    fontSize: "var(--text-sm)",
    lineHeight: "1.25rem",
  },
  header: {
    backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)",
  },
  containerSticky: {
    overflowY: "auto",
  },
  alignStart: { textAlign: "start" },
  alignCenter: { textAlign: "center" },
  alignEnd: {
    textAlign: "end",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  },
  footer: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)",
    fontWeight: "var(--font-weight-semibold)",
  },
  row: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    backgroundColor: {
      default: colors.surface,
      ":hover": "color-mix(in oklab, var(--muted) 45%, transparent)",
      ':is([data-state="selected"])': "color-mix(in oklab, var(--primary) 8%, transparent)",
    },
    transitionProperty: "background-color",
    transitionDuration: "var(--duration-normal)",
  },
  head: {
    height: "var(--control-height)",
    paddingInline: "0.75rem",
    verticalAlign: "middle",
    color: colors.mutedForeground,
    paddingRight: {
      default: "0.75rem",
      ":has([role=checkbox])": 0,
    },
  },
  cell: {
    height: "var(--control-height)",
    paddingInline: "0.75rem",
    paddingBlock: "0.5rem",
    verticalAlign: "middle",
    color: colors.foreground,
    fontVariantNumeric: "tabular-nums",
    paddingRight: {
      default: "0.75rem",
      ":has([role=checkbox])": 0,
    },
  },
  caption: {
    marginTop: "0.75rem",
    fontSize: "var(--text-sm)",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  empty: {
    height: "8rem",
    textAlign: "center",
    color: colors.mutedForeground,
  },
});

function Table({
  className,
  style,
  containerClassName,
  containerLabelledBy,
  dense = false,
  stickyHeader = false,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      tabIndex={0}
      aria-labelledby={containerLabelledBy}
      {...applyProps(
        containerClassName,
        undefined,
        styles.container,
        stickyHeader && styles.containerSticky,
      )}
    >
      <table
        data-slot="table"
        data-density={dense ? "dense" : "default"}
        data-sticky-header={stickyHeader ? "true" : undefined}
        {...applyProps(className, style, styles.table)}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"thead">, "className"> & { className?: HostClassName }) {
  return (
    <thead data-slot="table-header" {...applyProps(className, style, styles.header)} {...props} />
  );
}

function TableBody({ className, style, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...applyProps(className, style)} {...props} />;
}

function TableFooter({ className, style, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot data-slot="table-footer" {...applyProps(className, style, styles.footer)} {...props} />
  );
}

function TableRow({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"tr">, "className"> & { className?: HostClassName }) {
  return <tr data-slot="table-row" {...applyProps(className, style, styles.row)} {...props} />;
}

const alignStyles = {
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
} as const;

type TableHeadProps = Omit<React.ComponentProps<"th">, "align" | "className"> & {
  /** Match the cells below: figures and their header both use `end`. */
  align?: TableAlign;
  className?: HostClassName;
};

function TableHead({ className, style, align = "start", ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      data-align={align}
      {...applyProps(className, style, typography.label, styles.head, alignStyles[align])}
      {...props}
    />
  );
}

type TableCellProps = Omit<React.ComponentProps<"td">, "align" | "className"> & {
  align?: TableAlign;
  className?: HostClassName;
};

function TableCell({ className, style, align = "start", ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-align={align}
      {...applyProps(className, style, styles.cell, alignStyles[align])}
      {...props}
    />
  );
}

function TableCaption({ className, style, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      {...applyProps(className, style, styles.caption)}
      {...props}
    />
  );
}

function TableEmpty({
  children = "No hay datos para mostrar.",
  className,
  style,
  colSpan,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-empty"
      colSpan={colSpan}
      {...applyProps(className, style, styles.cell, styles.empty)}
      {...props}
    >
      {children}
    </td>
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
export type { TableCellProps, TableHeadProps, TableProps };
