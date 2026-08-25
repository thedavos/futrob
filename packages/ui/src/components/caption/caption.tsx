import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textTone } from "#styles/text-tone";
import { typography, type TextTone } from "#styles/typography";

export type CaptionElement = "p" | "span";

export type CaptionProps = ComponentProps<"p"> & {
  as?: CaptionElement;
  tone?: TextTone;
  truncate?: boolean;
};

function Caption({
  as: Tag = "p",
  className,
  style,
  tone = "muted",
  truncate = false,
  title,
  children,
  ...props
}: CaptionProps) {
  return (
    <Tag
      data-slot="caption"
      data-tone={tone}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.caption,
        textTone[tone],
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Caption };
