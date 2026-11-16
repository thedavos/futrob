import { View } from "react-native";
import { theme } from "@/theme/theme";
import { Button } from "./button";
import { Skeleton } from "./skeleton";
import { Text } from "./text";

/**
 * Loading, error and absence are distinct states (design.md; create-empty-state skill).
 * `LoadingState` announces the wait and shows skeleton rows shaped like the content;
 * `ErrorState` is a recoverable failure with retry, never phrased as «no data».
 * Absence uses `EmptyState`.
 */
export function LoadingState({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-busy
      style={{ gap: theme.spacing[3] }}
    >
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={theme.controlHeight + theme.spacing[3]} />
      ))}
    </View>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  /** A retry is in flight; the button shows progress and cannot be pressed twice. */
  retrying?: boolean;
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderRadius: theme.corner.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[8],
        alignItems: "center",
        gap: theme.spacing[2],
      }}
    >
      <Text role="heading" accessibilityRole="header" style={{ textAlign: "center" }}>
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
      {onRetry && retryLabel ? (
        <View style={{ marginTop: theme.spacing[4], alignSelf: "stretch" }}>
          <Button label={retryLabel} loading={retrying} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
