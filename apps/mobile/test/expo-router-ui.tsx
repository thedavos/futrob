import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { View, type PressableProps, type ViewProps } from "react-native";
import { usePathname, useRouter, useTestSlot } from "./expo-router";

/**
 * Stand-in for Expo Router's headless tabs (`expo-router/ui`). `TabSlot` renders the route
 * under the layout; a trigger is focused when its href is the current path and pressing it
 * navigates there.
 */
export type TabTriggerSlotProps = Omit<PressableProps, "children"> & {
  children?: ReactNode;
  isFocused?: boolean;
  href?: string;
};

export function Tabs({ children, ...props }: ViewProps) {
  return <View {...props}>{children}</View>;
}

export function TabSlot() {
  return <>{useTestSlot()}</>;
}

export function TabList({ asChild, children, ...props }: ViewProps & { asChild?: boolean }) {
  if (asChild) return <>{children}</>;
  return <View {...props}>{children}</View>;
}

export function TabTrigger({
  href,
  asChild,
  children,
}: {
  name: string;
  href: string;
  asChild?: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = new URL(href, "app://futrob").pathname === pathname;
  const child = Children.only(children);
  if (!asChild || !isValidElement(child)) {
    throw new Error("The test TabTrigger only supports asChild");
  }
  // SAFETY: the app's triggers wrap a slot component that accepts `TabTriggerSlotProps`.
  return cloneElement(child as ReactElement<TabTriggerSlotProps>, {
    isFocused,
    href,
    onPress: () => {
      if (!isFocused) router.push(href);
    },
  });
}
