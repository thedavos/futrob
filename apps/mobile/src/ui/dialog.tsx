import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * Mobile Dialog — a native modal sheet anchored to the bottom edge, mirroring the
 * `@futrob/ui` Dialog contract: a heading, optional description, scrollable body and a
 * footer for actions. Android back, the backdrop and the close button all call `onClose`.
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Accessible name of the close button, in the active language. */
  closeLabel: string;
  children?: ReactNode;
  /** Buttons, primary first; stacked full width. */
  actions?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  actions,
}: DialogProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          }}
        />
        <View
          accessibilityViewIsModal
          aria-modal
          role="dialog"
          aria-label={title}
          style={{
            maxHeight: "85%",
            borderTopLeftRadius: theme.corner["2xl"],
            borderTopRightRadius: theme.corner["2xl"],
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors["surface-raised"],
            paddingTop: theme.spacing[4],
            paddingBottom: Math.max(insets.bottom, theme.spacing[4]),
            paddingLeft: Math.max(insets.left, theme.spacing[5]),
            paddingRight: Math.max(insets.right, theme.spacing[5]),
            gap: theme.spacing[4],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[3] }}>
            <View style={{ flex: 1, gap: theme.spacing[1], paddingTop: theme.spacing[2] }}>
              <Text role="heading" accessibilityRole="header">
                {title}
              </Text>
              {description ? <Text color="muted-foreground">{description}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
              style={{
                width: theme.controlHeight,
                height: theme.controlHeight,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: theme.corner.full,
              }}
            >
              <Icon name="close" size={20} color="foreground" />
            </Pressable>
          </View>
          {children ? (
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: theme.spacing[4] }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : null}
          {actions ? <View style={{ gap: theme.spacing[2] }}>{actions}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
