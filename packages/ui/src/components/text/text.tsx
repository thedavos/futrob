import type { HTMLAttributes } from "react";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textAlign, type TextAlign } from "#styles/text-align";
import { textTone } from "#styles/text-tone";
import { textWeight, type TextWeight } from "#styles/text-weight";
import { typography, type TextTone } from "#styles/typography";

const lookStyles = {
  body: typography.body,
  caption: typography.caption,
  label: typography.label,
  subtitle: typography.subtitle,
} as const;

export type TextLook = keyof typeof lookStyles;
export type TextElement = "span" | "p" | "strong" | "em" | "div";

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: TextElement;
  /** Type role. Do not confuse with the ARIA `role` attribute. */
  look?: TextLook;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextAlign;
  truncate?: boolean;
};

function Text({
  as: Tag = "span",
  className,
  style,
  look = "body",
  tone = "default",
  weight,
  align = "start",
  truncate = false,
  title,
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      data-slot="text"
      data-look={look}
      data-tone={tone}
      data-weight={weight}
      data-align={align}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        lookStyles[look],
        textTone[tone],
        weight && textWeight[weight],
        textAlign[align],
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Text };
