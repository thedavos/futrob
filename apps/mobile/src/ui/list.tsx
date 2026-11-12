import { Children, Fragment, isValidElement, useState, type ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";
import { theme } from "@/theme/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * Mobile List — rows separated by a hairline inside a flat surface. Rows are the unit of
 * navigation on mobile (design.md: «La fila … es la unidad de navegación»).
 */
export interface ListProps extends ViewProps {
  /** Accessible name for the list when the surrounding heading does not already name it. */
  label?: string;
}

export function List({ label, style, children, ...props }: ListProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={label}
      style={[
        {
          borderRadius: theme.corner.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          overflow: "hidden",
        },
        style,
      ]}
      {...props}
    >
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? (
            <View style={{ height: 1, backgroundColor: theme.colors["border-subtle"] }} />
          ) : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export interface ListItemProps {
  title: string;
  description?: string;
  /** Content before the text, such as a crest or avatar. Decorative unless it says otherwise. */
  leading?: ReactNode;
  /** Short trailing content, such as a count or a badge. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Marks the current choice with a check and `selected` state, never by color alone. */
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ListItem({
  title,
  description,
  leading,
  trailing,
  onPress,
  selected = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: ListItemProps) {
  const [pressed, setPressed] = useState(false);
  const content = (
    <>
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, gap: theme.spacing[1] }}>
        <Text role="label" numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text role="caption" color="muted-foreground" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
      {selected ? <Icon name="check" color="primary" size={18} /> : null}
      {onPress && !selected ? <Icon name="chevron-right" /> : null}
    </>
  );
  const rowStyle = {
    minHeight: description ? 56 : theme.controlHeight,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  };

  if (!onPress) {
    return (
      <View accessibilityRole="text" style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint ?? description}
      aria-selected={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        rowStyle,
        {
          backgroundColor: pressed ? theme.colors.muted : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Caption heading for a group of rows, such as the selector's «Competiciones». */
export function ListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <Text role="caption" color="muted-foreground" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}
