import { useRender } from "@base-ui/react/use-render";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  base: {
    color: {
      default: colors.primary,
      ":hover": colors.primaryHover,
      ":active": colors.primaryHover,
      ':is([aria-disabled="true"])': colors.mutedForeground,
    },
    textDecorationLine: "underline",
    textDecorationThickness: "from-font",
    textUnderlinePosition: "from-font",
    textUnderlineOffset: "0.15em",
    textDecorationSkipInk: "auto",
    outlineOffset: {
      default: null,
      ":focus-visible": 2,
    },
    pointerEvents: {
      default: null,
      ':is([aria-disabled="true"])': "none",
    },
  },
});

const textStyles = {
  body: typography.body,
  caption: typography.caption,
  label: typography.label,
} as const;

export type TextLinkText = keyof typeof textStyles;

export type TextLinkProps = useRender.ComponentProps<"a"> & {
  /** Type role. Do not confuse with the ARIA `role` attribute. */
  text?: TextLinkText;
};

function TextLink({ className, style, render, text = "body", ...props }: TextLinkProps) {
  return useRender({
    defaultTagName: "a",
    props: {
      ...props,
      ...applyProps(className, style, typography.host, textStyles[text], styles.base),
      "data-slot": "text-link",
      "data-text": text,
    },
    render,
  });
}

export { TextLink };
