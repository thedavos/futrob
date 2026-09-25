import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
  },
  viewport: {
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    boxSizing: "border-box",
    paddingInlineEnd: "0.75rem",
    scrollbarWidth: "none",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  scrollbar: {
    display: "flex",
    touchAction: "none",
    padding: 0,
    pointerEvents: "auto",
    userSelect: "none",
    transitionProperty: "opacity",
    transitionDuration: {
      default: "var(--duration-normal)",
      ":is([data-scrolling])": "0s",
    },
    opacity: {
      default: 0.7,
      ":is([data-hovering])": 1,
      ":is([data-scrolling])": 1,
    },
  },
  scrollbarVertical: {
    width: "0.25rem",
    flexDirection: "column",
  },
  scrollbarHorizontal: {
    height: "0.25rem",
    flexDirection: "row",
  },
  thumb: {
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.borderStrong,
  },
  content: {
    minWidth: 0,
  },
});

type ScrollAreaProps = Omit<ScrollAreaPrimitive.Root.Props, "className"> & {
  className?: HostClassName | ScrollAreaPrimitive.Root.Props["className"];
};

function ScrollArea({ className, style, children, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      {...applyProps(className, style, styles.root)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        {...applyProps("base-ui-disable-scrollbar", undefined, styles.viewport)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

type ScrollBarProps = Omit<ScrollAreaPrimitive.Scrollbar.Props, "className"> & {
  className?: HostClassName | ScrollAreaPrimitive.Scrollbar.Props["className"];
};

function ScrollBar({ className, style, orientation = "vertical", ...props }: ScrollBarProps) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...applyProps(
        className,
        style,
        styles.scrollbar,
        orientation === "horizontal" ? styles.scrollbarHorizontal : styles.scrollbarVertical,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        {...applyProps(undefined, undefined, styles.thumb)}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

type ScrollAreaContentProps = Omit<ScrollAreaPrimitive.Content.Props, "className"> & {
  className?: HostClassName | ScrollAreaPrimitive.Content.Props["className"];
};

function ScrollAreaContent({ className, style, ...props }: ScrollAreaContentProps) {
  return (
    <ScrollAreaPrimitive.Content
      data-slot="scroll-area-content"
      {...applyProps(className, style, styles.content)}
      {...props}
    />
  );
}

export { ScrollArea, ScrollAreaContent, ScrollBar };
