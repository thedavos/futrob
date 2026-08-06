import * as React from "react";

import { cn } from "#lib/utils";

type TableProps = React.ComponentProps<"table"> & {
  /** Reduces row height to 36px on desktop. Touch layouts remain comfortable. */
  dense?: boolean;
  containerClassName?: string;
};

function Table({ className, containerClassName, dense = false, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto rounded-lg border border-border",
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        data-density={dense ? "dense" : "default"}
        className={cn("group/table w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/60 [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-muted/60 font-semibold", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border-subtle bg-surface transition-colors hover:bg-muted/45 data-[state=selected]:bg-primary/8",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "typo-label h-(--control-height) px-3 text-left align-middle text-muted-foreground group-data-[density=dense]/table:h-(--control-height-dense) max-sm:group-data-[density=dense]/table:h-(--control-height-touch) [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-(--control-height) px-3 py-2 align-middle text-foreground tabular-nums group-data-[density=dense]/table:h-(--control-height-dense) group-data-[density=dense]/table:py-1.5 max-sm:group-data-[density=dense]/table:h-(--control-height-touch) [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function TableEmpty({
  children = "No hay datos para mostrar.",
  className,
  colSpan,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <TableCell
      data-slot="table-empty"
      className={cn("h-32 text-center text-muted-foreground", className)}
      colSpan={colSpan}
      {...props}
    >
      {children}
    </TableCell>
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
