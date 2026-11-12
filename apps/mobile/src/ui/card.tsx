import { View, type ViewProps } from "react-native";
import { theme } from "@/theme/theme";
import { Text } from "./text";

/**
 * Mobile Card — the `flat` surface of `@futrob/ui` Card: surface background, structural
 * border and `corner-xl`. `title` renders a section heading inside the card.
 */
export interface CardProps extends ViewProps {
  title?: string;
  /** Drop the inner padding when the content brings its own (lists, media). */
  flush?: boolean;
}

export function Card({ title, flush = false, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          borderRadius: theme.corner.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: flush ? 0 : theme.spacing[5],
          gap: theme.spacing[3],
          overflow: "hidden",
        },
        style,
      ]}
      {...props}
    >
      {title ? (
        <Text
          role="subtitle"
          accessibilityRole="header"
          style={
            flush ? { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[5] } : null
          }
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
