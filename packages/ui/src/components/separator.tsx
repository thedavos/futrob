import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  base: {
    flexShrink: 0,
    backgroundColor: colors.border,
  },
  horizontal: {
    height: 1,
    width: "100%",
  },
  vertical: {
    height: "100%",
    width: 1,
  },
});

function Separator({
  className,
  style,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      {...applyProps(
        className,
        style,
        styles.base,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
      )}
      {...props}
    />
  );
}

export { Separator };
