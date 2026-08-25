import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

type TableProps = React.ComponentProps<"table"> & {
  /** Reduces row height to 36px on desktop. Touch layouts remain comfortable. */
  dense?: boolean;
  containerClassName?: string;
};

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
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  header: {
    backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)",
  },
  footer: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: "color-mix(in oklab, var(--muted) 60%, transparent)",
    fontWeight: 600,
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
    textAlign: "left",
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
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  empty: {
    height: "8rem",
    textAlign: "center",
    color: colors.mutedForeground,
  },
});

function Table({ className, style, containerClassName, dense = false, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      {...applyHost(containerClassName, undefined, styles.container)}
    >
      <table
        data-slot="table"
        data-density={dense ? "dense" : "default"}
        {...applyHost(className, style, styles.table)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, style, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead data-slot="table-header" {...applyHost(className, style, styles.header)} {...props} />
  );
}

function TableBody({ className, style, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...applyHost(className, style)} {...props} />;
}

function TableFooter({ className, style, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot data-slot="table-footer" {...applyHost(className, style, styles.footer)} {...props} />
  );
}

function TableRow({ className, style, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" {...applyHost(className, style, styles.row)} {...props} />;
}

function TableHead({ className, style, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      {...applyHost(className, style, typography.label, styles.head)}
      {...props}
    />
  );
}

function TableCell({ className, style, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" {...applyHost(className, style, styles.cell)} {...props} />;
}

function TableCaption({ className, style, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      {...applyHost(className, style, styles.caption)}
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
      {...applyHost(className, style, styles.cell, styles.empty)}
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
export type { TableProps };
