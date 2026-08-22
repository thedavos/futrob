import { View, type ViewProps } from "react-native";
import { Text } from "@/ui/text";
import { theme } from "@/theme/theme";

/**
 * Mobile EmptyState — flat variant with dashed structural border,
 * mirroring `@futrob/ui` EmptyState (`variant="flat"`).
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
          borderRadius: theme.corner.lg,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing[6],
          paddingVertical: theme.spacing[8],
          alignItems: "center",
          gap: theme.spacing[2],
        },
        style,
      ]}
      {...props}
    >
      <Text role="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {description ? (
        <Text
          role="caption"
          color="muted-foreground"
          style={{ textAlign: "center", maxWidth: 280 }}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.spacing[4] }}>{action}</View> : null}
    </View>
  );
}
