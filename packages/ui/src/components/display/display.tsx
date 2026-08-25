import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { typography } from "#styles/typography";

export type DisplayLevel = "h1" | "h2" | "h3";

export type DisplayProps = ComponentProps<"h1"> & {
  as?: DisplayLevel;
  truncate?: boolean;
};

function Display({
  as: Tag = "h1",
  className,
  style,
  truncate = false,
  title,
  children,
  ...props
}: DisplayProps) {
  return (
    <Tag
      data-slot="display"
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.display,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Display };
