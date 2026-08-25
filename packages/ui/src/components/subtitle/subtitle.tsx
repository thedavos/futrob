import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textTone } from "#styles/text-tone";
import { typography, type TextTone } from "#styles/typography";

export type SubtitleElement = "p" | "span";

export type SubtitleProps = ComponentProps<"p"> & {
  as?: SubtitleElement;
  tone?: TextTone;
  truncate?: boolean;
};

function Subtitle({
  as: Tag = "p",
  className,
  style,
  tone = "muted",
  truncate = false,
  title,
  children,
  ...props
}: SubtitleProps) {
  return (
    <Tag
      data-slot="subtitle"
      data-tone={tone}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.subtitle,
        textTone[tone],
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Subtitle };
