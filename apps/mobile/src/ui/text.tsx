import { forwardRef } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { theme, type ThemeColorName } from "@/theme/theme";
import type { TypoRole } from "@futrob/ui-tokens";

export interface TextProps extends Omit<RNTextProps, "role"> {
  /** Typography role from the design system (default: body). */
  role?: TypoRole;
  /** Semantic color token name (default: foreground). */
  color?: ThemeColorName;
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  { role = "body", color = "foreground", style, ...props },
  ref,
) {
  return (
    <RNText
      ref={ref}
      style={[theme.typo(role), { color: theme.colors[color] }, style]}
      {...props}
    />
  );
});
