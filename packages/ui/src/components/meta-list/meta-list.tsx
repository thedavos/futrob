import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { media } from "#styles/media.stylex";
import { textTone } from "#styles/text-tone";
import { typography } from "#styles/typography";

const styles = stylex.create({
  list: {
    display: "grid",
    margin: 0,
    columnGap: "1.5rem",
    rowGap: "1rem",
  },
  columns1: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  columns2: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  item: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
});

const columnStyles = {
  1: styles.columns1,
  2: styles.columns2,
} as const;

export type MetaListColumns = keyof typeof columnStyles;

export type MetaListProps = ComponentProps<"dl"> & {
  columns?: MetaListColumns;
};

function MetaList({ className, style, columns = 1, ...props }: MetaListProps) {
  return (
    <dl
      data-slot="meta-list"
      data-columns={columns}
      {...applyProps(className, style, styles.list, columnStyles[columns])}
      {...props}
    />
  );
}

function MetaItem({ className, style, ...props }: ComponentProps<"div">) {
  return <div data-slot="meta-item" {...applyProps(className, style, styles.item)} {...props} />;
}

function MetaTerm({ className, style, ...props }: ComponentProps<"dt">) {
  return (
    <dt
      data-slot="meta-term"
      {...applyProps(className, style, typography.host, typography.caption, textTone.muted)}
      {...props}
    />
  );
}

export type MetaValueProps = ComponentProps<"dd"> & {
  truncate?: boolean;
};

function MetaValue({
  className,
  style,
  truncate = false,
  title,
  children,
  ...props
}: MetaValueProps) {
  return (
    <dd
      data-slot="meta-value"
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.caption,
        textTone.default,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </dd>
  );
}

export { MetaItem, MetaList, MetaTerm, MetaValue };
