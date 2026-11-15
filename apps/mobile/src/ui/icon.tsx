import Svg, { Path } from "react-native-svg";
import { theme, type ThemeColorName } from "@/theme/theme";

/** Lucide-style strokes for the few glyphs the primitives need. Always decorative. */
const PATHS = {
  "chevron-right": "M9 18l6-6-6-6",
  "chevron-down": "M6 9l6 6 6-6",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18M6 6l12 12",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  color = "muted-foreground",
}: {
  name: IconName;
  size?: number;
  color?: ThemeColorName;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={PATHS[name]}
        stroke={theme.colors[color]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
