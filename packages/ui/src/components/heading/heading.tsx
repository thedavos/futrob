import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps, type HostClassName } from "#styles/apply";
import { textWeight } from "#styles/text-weight";
import { typography } from "#styles/typography";

export type HeadingLevel = "h2" | "h3" | "h4" | "h5" | "h6";

/** Each level steps down by size or weight: 20/700 → 18/600 → 14/600. */
const looks = {
  h2: { name: "heading", styles: [typography.heading] },
  h3: { name: "title", styles: [typography.title] },
  h4: { name: "strong", styles: [typography.body, textWeight.semibold] },
  h5: { name: "strong", styles: [typography.body, textWeight.semibold] },
  h6: { name: "strong", styles: [typography.body, textWeight.semibold] },
} as const;

export type HeadingProps = Omit<ComponentProps<"h2">, "className"> & {
  as?: HeadingLevel;
  className?: HostClassName;
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
      data-look={looks[Tag].name}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        ...looks[Tag].styles,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Heading };
