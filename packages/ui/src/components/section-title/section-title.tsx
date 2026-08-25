import type { ComponentProps } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textTone } from "#styles/text-tone";
import { typography, type TextTone } from "#styles/typography";

export type SectionTitleLevel = "h2" | "h3" | "h4";

export type SectionTitleProps = ComponentProps<"h2"> & {
  as?: SectionTitleLevel;
  tone?: TextTone;
  truncate?: boolean;
};

function SectionTitle({
  as: Tag = "h2",
  className,
  style,
  tone = "default",
  truncate = false,
  title,
  children,
  ...props
}: SectionTitleProps) {
  return (
    <Tag
      data-slot="section-title"
      data-tone={tone}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.label,
        textTone[tone],
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { SectionTitle };
