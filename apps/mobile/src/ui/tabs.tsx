import { Pressable, View } from "react-native";
import { theme } from "@/theme/theme";
import { Text } from "./text";

/**
 * Mobile Tabs — the closed variants of `@futrob/ui` Tabs for switching views inside a screen:
 * `line` (2dp lime indicator, default) and `pills` (filled segment). The active tab is also
 * semibold and announced as selected, so it never depends on color alone. Render the panel
 * for `value` below the tab list.
 */
export type TabsVariant = "line" | "pills";

export interface TabsItem<Id extends string> {
  id: Id;
  label: string;
}

export interface TabsProps<Id extends string> {
  items: readonly TabsItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Accessible name of the tab list, e.g. «Vista de partidos». */
  label: string;
  variant?: TabsVariant;
}

export function Tabs<Id extends string>({
  items,
  value,
  onChange,
  label,
  variant = "line",
}: TabsProps<Id>) {
  const pills = variant === "pills";
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={
        pills
          ? {
              flexDirection: "row",
              gap: theme.spacing[1],
              padding: theme.spacing[1],
              borderRadius: theme.corner.lg,
              backgroundColor: theme.colors.muted,
              alignSelf: "flex-start",
            }
          : {
              flexDirection: "row",
              gap: theme.spacing[5],
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }
      }
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={item.label}
            onPress={() => {
              if (!selected) onChange(item.id);
            }}
            style={
              pills
                ? {
                    minHeight: theme.controlHeight,
                    minWidth: theme.controlHeight,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.corner.md,
                    backgroundColor: selected ? theme.colors.background : "transparent",
                  }
                : {
                    minHeight: theme.controlHeight,
                    minWidth: theme.controlHeight,
                    justifyContent: "center",
                    alignItems: "center",
                    borderBottomWidth: 2,
                    borderBottomColor: selected ? theme.colors.primary : "transparent",
                    marginBottom: -1,
                  }
            }
          >
            <Text
              role="label"
              color={selected ? "foreground" : "muted-foreground"}
              style={{ fontFamily: selected ? theme.fontFamily.semibold : theme.fontFamily.medium }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
