import { forwardRef, useId, useState } from "react";
import { Text as RNText, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "@/theme/theme";

/**
 * Mobile Input with label + error, mirroring the Field/Input contract of
 * `@futrob/ui`: accessible label, visible invalid state and 44dp height.
 */
export interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error = null, hint, style, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hintId = useId();
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.ring
      : theme.colors.input;

  return (
    <View>
      <RNText
        accessibilityElementsHidden={false}
        style={{
          fontFamily: theme.fontFamily.medium,
          fontSize: theme.textSizes.xs,
          lineHeight: 16,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          color: theme.colors.foreground,
          marginBottom: theme.spacing[2],
        }}
      >
        {label}
      </RNText>
      <TextInput
        ref={ref}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        placeholderTextColor={theme.colors["muted-foreground"]}
        style={[
          {
            minHeight: theme.controlHeight,
            borderRadius: theme.corner.md,
            borderWidth: 1,
            borderColor,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing[3],
            paddingVertical: theme.spacing[2],
            fontFamily: theme.fontFamily.regular,
            fontSize: theme.textSizes.sm,
            color: theme.colors.foreground,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <RNText
          nativeID={hintId}
          role="alert"
          style={{
            fontFamily: theme.fontFamily.regular,
            fontSize: theme.textSizes.xs,
            lineHeight: 18,
            color: theme.colors.danger,
            marginTop: theme.spacing[1],
          }}
        >
          {error}
        </RNText>
      ) : hint ? (
        <RNText
          nativeID={hintId}
          style={{
            fontFamily: theme.fontFamily.regular,
            fontSize: theme.textSizes.xs,
            lineHeight: 18,
            color: theme.colors["muted-foreground"],
            marginTop: theme.spacing[1],
          }}
        >
          {hint}
        </RNText>
      ) : null}
    </View>
  );
});
