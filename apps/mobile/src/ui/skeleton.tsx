import { View, type DimensionValue, type ViewProps } from "react-native";
import { theme } from "@/theme/theme";

/**
 * Mobile Skeleton — a muted placeholder block, hidden from assistive technology. Wrap
 * skeletons in `LoadingState` (or another labelled progress region) so the wait is announced.
 * It does not pulse: a still placeholder needs no reduced-motion handling.
 */
export interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
}

export function Skeleton({ width = "100%", height = 16, style, ...props }: SkeletonProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: theme.corner.md, backgroundColor: theme.colors.muted },
        style,
      ]}
      {...props}
    />
  );
}
