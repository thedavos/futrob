import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { typography } from "#styles/typography";

export type HeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6";

const lookStyles = {
  h2: typography.heading,
  h3: typography.heading,
  h4: typography.subtitle,
  h5: typography.subtitle,
  h6: typography.subtitle,
} as const;

export type HeadingProps = ComponentProps<"h2"> & {
  as?: HeadingLevel;
  truncate?: boolean;
};

function Heading({
  as: Tag = "h2",
  className,
  style,
  truncate = false,
  title,
  children,
  ...props
}: HeadingProps) {
  return (
    <Tag
      data-slot="heading"
      data-look={Tag === "h2" || Tag === "h3" ? "heading" : "subtitle"}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        lookStyles[Tag],
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Heading };
