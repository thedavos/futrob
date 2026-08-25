import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
  },
  viewport: {
    width: "100%",
    height: "100%",
    borderRadius: "inherit",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  scrollbar: {
    margin: 1,
    display: "flex",
    touchAction: "none",
    padding: 1,
    transitionProperty: "opacity",
    transitionDuration: {
      default: "var(--duration-normal)",
      ":is([data-scrolling])": "0s",
    },
    userSelect: "none",
    opacity: {
      default: null,
      ":is([data-hovering])": 1,
      ":is([data-scrolling])": 1,
    },
  },
  scrollbarVertical: {
    width: "0.625rem",
    flexDirection: "column",
  },
  scrollbarHorizontal: {
    height: "0.625rem",
    flexDirection: "row",
  },
  thumb: {
    position: "relative",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.borderStrong,
  },
  content: {
    minWidth: 0,
  },
});

function ScrollArea({ className, style, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      {...applyProps(className, style, styles.root)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        {...applyProps(undefined, undefined, styles.viewport)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  style,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
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

function ScrollAreaContent({ className, style, ...props }: ScrollAreaPrimitive.Content.Props) {
  return (
    <ScrollAreaPrimitive.Content
      data-slot="scroll-area-content"
      {...applyProps(className, style, styles.content)}
      {...props}
    />
  );
}

export { ScrollArea, ScrollAreaContent, ScrollBar };
