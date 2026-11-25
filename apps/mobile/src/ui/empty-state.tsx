import { View, type ViewProps } from "react-native";
import { Text } from "@/ui/text";
import { theme } from "@/theme/theme";

/**
 * Mobile EmptyState — open composition on the page background (no dashed panel or elevation),
 * mirroring `@futrob/ui` EmptyState.
 */
export interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action, style, ...props }: EmptyStateProps) {
  return (
    <View
      style={[
        {
          paddingHorizontal: theme.spacing[6],
          paddingVertical: theme.spacing[8],
          alignItems: "center",
          gap: theme.spacing[3],
        },
        style,
      ]}
      {...props}
    >
      <Text role="title" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {description ? (
        <Text
          role="subtitle"
          color="muted-foreground"
          style={{ textAlign: "center", maxWidth: 320 }}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.spacing[3] }}>{action}</View> : null}
    </View>
  );
}
