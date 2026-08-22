import { forwardRef, useState } from "react";
import { ActivityIndicator, Pressable, Text as RNText, View, type ViewProps } from "react-native";
import { theme } from "@/theme/theme";
import type { ThemeColorName } from "@/theme/theme";

/**
 * Mobile Button — closed variants mirroring `@futrob/ui`:
 * primary | secondary | outline | ghost | destructive.
 * Height is the universal 44dp control token. No dense mode on mobile.
 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";

export interface ButtonProps extends Omit<ViewProps, "children"> {
  variant?: ButtonVariant;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface ButtonSkin {
  background: string | undefined;
  pressedBackground: string;
  border: string | undefined;
  textColor: ThemeColorName;
}

const SKINS = {
  primary: {
    background: theme.colors.primary,
    pressedBackground: theme.colors["primary-hover"],
    border: undefined,
    textColor: "primary-foreground",
  },
  secondary: {
    background: theme.colors.secondary,
    pressedBackground: theme.colors["secondary-hover"],
    border: undefined,
    textColor: "secondary-foreground",
  },
  outline: {
    background: undefined,
    pressedBackground: theme.colors.muted,
    border: theme.colors.border,
    textColor: "foreground",
  },
  ghost: {
    background: undefined,
    pressedBackground: theme.colors.muted,
    border: undefined,
    textColor: "foreground",
  },
  destructive: {
    background: theme.colors.danger,
    pressedBackground: theme.colors.danger,
    border: undefined,
    textColor: "danger-foreground",
  },
} satisfies Record<ButtonVariant, ButtonSkin>;

export const Button = forwardRef<View, ButtonProps>(function Button(
  { variant = "primary", label, onPress, disabled = false, loading = false, style, ...props },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const skin = SKINS[variant];
  const isInactive = disabled || loading;

  return (
    <View ref={ref} style={style} {...props}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: isInactive }}
        disabled={isInactive}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          {
            minHeight: theme.controlHeight,
            borderRadius: theme.corner.md,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.spacing[4],
            backgroundColor: isInactive
              ? skin.background === undefined
                ? "transparent"
                : theme.colors.muted
              : pressed
                ? skin.pressedBackground
                : skin.background,
            borderWidth: skin.border === undefined ? 0 : 1,
            borderColor: isInactive
              ? theme.colors["border-subtle"]
              : (skin.border ?? "transparent"),
            opacity: isInactive && skin.background === undefined ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors[skin.textColor]} />
        ) : (
          <RNText
            style={{
              fontFamily: theme.fontFamily.medium,
              fontSize: theme.textSizes.sm,
              lineHeight: 20,
              color: isInactive ? theme.colors["muted-foreground"] : theme.colors[skin.textColor],
            }}
          >
            {label}
          </RNText>
        )}
      </Pressable>
    </View>
  );
});
