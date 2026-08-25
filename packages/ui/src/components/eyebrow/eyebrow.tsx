import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textTone } from "#styles/text-tone";
import { typography } from "#styles/typography";

export type EyebrowElement = "p" | "span";

export type EyebrowProps = ComponentProps<"p"> & {
  as?: EyebrowElement;
  truncate?: boolean;
};

function Eyebrow({
  as: Tag = "p",
  className,
  style,
  truncate = false,
  title,
  children,
  ...props
}: EyebrowProps) {
  return (
    <Tag
      data-slot="eyebrow"
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.label,
        textTone.muted,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Eyebrow };
