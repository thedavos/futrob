import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { CheckIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

const styles = stylex.create({
  group: {
    display: "grid",
    gap: "0.75rem",
  },
  item: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.input,
      ":focus-visible": colors.ring,
      ":is([data-checked])": colors.primary,
    },
    backgroundColor: {
      default: colors.surface,
      ":hover": colors.muted,
      ":is([data-checked])": colors.accent,
      ":is([data-checked]):hover": colors.accent,
    },
    color: colors.foreground,
    outlineWidth: 0,
    outlineStyle: "none",
    transitionProperty: "background-color, border-color, color, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    pointerEvents: {
      default: null,
      ":is([data-disabled])": "none",
    },
    cursor: {
      default: "pointer",
      ":is([data-disabled])": "not-allowed",
    },
    opacity: {
      default: 1,
      ":is([data-disabled])": 0.5,
    },
    scale: {
      default: 1,
      ":active": 0.96,
    },
  },
  tile: {
    minHeight: {
      default: "6rem",
      [media.sm]: "7rem",
    },
    flexDirection: {
      default: "row",
      [media.sm]: "column",
    },
    justifyContent: {
      default: "flex-start",
      [media.sm]: "center",
    },
    gap: {
      default: "1rem",
      [media.sm]: "0.75rem",
    },
    borderRadius: "var(--corner-xl)",
    paddingTop: {
      default: "0.75rem",
      [media.sm]: "1.25rem",
    },
    paddingBottom: {
      default: "0.75rem",
      [media.sm]: "1.25rem",
    },
    paddingRight: {
      default: "3rem",
      [media.sm]: "1.25rem",
    },
    paddingLeft: {
      default: "1rem",
      [media.sm]: "1.25rem",
    },
    textAlign: {
      default: "left",
      [media.sm]: "center",
    },
  },
  pill: {
    minHeight: "var(--control-height)",
    justifyContent: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-full)",
    paddingInline: "1.25rem",
    paddingBlock: "0.5rem",
  },
  indicator: {
    position: "absolute",
    right: "0.75rem",
    top: "0.75rem",
    display: "flex",
    width: "1.5rem",
    height: "1.5rem",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    transitionProperty: "opacity, filter, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    scale: {
      default: 1,
      ":is([data-unchecked])": 0.25,
      ":is([data-checked])": 1,
    },
    opacity: {
      default: null,
      ":is([data-unchecked])": 0,
      ":is([data-checked])": 1,
    },
    filter: {
      default: null,
      ":is([data-unchecked])": "blur(4px)",
      ":is([data-checked])": "blur(0)",
    },
  },
  indicatorIcon: {
    width: "1rem",
    height: "1rem",
  },
});

const appearanceStyles = {
  tile: styles.tile,
  pill: styles.pill,
} as const;

export type ChoiceGroupAppearance = keyof typeof appearanceStyles;

function ChoiceGroup<Value>({ className, style, ...props }: RadioGroupPrimitive.Props<Value>) {
  return (
    <RadioGroupPrimitive
      data-slot="choice-group"
      {...applyProps(className, style, styles.group)}
      {...props}
    />
  );
}

type ChoiceGroupItemProps<Value = string> = Radio.Root.Props<Value> & {
  appearance?: ChoiceGroupAppearance;
};

function ChoiceGroupItem<Value>({
  appearance = "tile",
  className,
  style,
  ...props
}: ChoiceGroupItemProps<Value>) {
  return (
    <Radio.Root
      data-slot="choice-group-item"
      data-appearance={appearance}
      {...applyProps(className, style, styles.item, appearanceStyles[appearance])}
      {...props}
    />
  );
}

function ChoiceGroupIndicator({ className, style, ...props }: Radio.Indicator.Props) {
  return (
    <Radio.Indicator
      keepMounted
      data-slot="choice-group-indicator"
      {...applyProps(className, style, styles.indicator)}
      {...props}
    >
      <CheckIcon
        aria-hidden="true"
        {...applyProps(undefined, undefined, styles.indicatorIcon)}
        strokeWidth={2.5}
      />
    </Radio.Indicator>
  );
}

export {
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  appearanceStyles as choiceGroupItemVariants,
};
export type { ChoiceGroupItemProps };
