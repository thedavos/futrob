import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";
import { media } from "#styles/media.stylex";

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: "color-mix(in oklab, var(--neutral-950) 45%, transparent)",
    transitionProperty: "opacity",
    transitionDuration: "var(--duration-normal)",
  },
  content: {
    position: "fixed",
    zIndex: 50,
    display: "flex",
    backgroundColor: colors.popover,
    color: colors.popoverForeground,
    transitionProperty: "opacity, translate",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-emphasized)",
    outlineWidth: 0,
    outlineStyle: "none",
  },
  sideTop: {
    top: 0,
    right: 0,
    left: 0,
    maxHeight: "85dvh",
    flexDirection: "column",
    "--sheet-exit-translate": "0 -100%",
  },
  sideRight: {
    top: 0,
    right: 0,
    bottom: 0,
    width: "min(26rem, 90vw)",
    flexDirection: "column",
    "--sheet-exit-translate": "100% 0",
  },
  sideBottom: {
    right: 0,
    bottom: 0,
    left: 0,
    maxHeight: "85dvh",
    flexDirection: "column",
    "--sheet-exit-translate": "0 100%",
  },
  sideLeft: {
    top: 0,
    bottom: 0,
    left: 0,
    width: "min(26rem, 90vw)",
    flexDirection: "column",
    "--sheet-exit-translate": "-100% 0",
  },
  close: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    display: "inline-flex",
    width: "2.5rem",
    height: "2.5rem",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    color: {
      default: colors.mutedForeground,
      ":hover": colors.foreground,
    },
    backgroundColor: {
      default: "transparent",
      ":hover": colors.muted,
    },
    transitionProperty: "color, background-color",
    transitionDuration: "var(--duration-normal)",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  closeIcon: {
    width: "1rem",
    height: "1rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    padding: "1.25rem",
    paddingRight: "4rem",
  },
  body: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    overflowY: "auto",
    padding: "1.25rem",
  },
  footer: {
    display: "flex",
    flexDirection: {
      default: "column-reverse",
      [media.sm]: "row",
    },
    justifyContent: {
      default: null,
      [media.sm]: "flex-end",
    },
    gap: "0.5rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    padding: "1.25rem",
  },
  title: {
    fontSize: "1.125rem",
    lineHeight: "var(--leading-tight)",
    fontWeight: 600,
    letterSpacing: "var(--tracking-tight)",
    color: colors.foreground,
  },
  description: {
    fontSize: "0.875rem",
    lineHeight: 1.625,
    color: colors.mutedForeground,
  },
});

const sideStyles = {
  top: styles.sideTop,
  right: styles.sideRight,
  bottom: styles.sideBottom,
  left: styles.sideLeft,
} as const;

export type SheetSide = keyof typeof sideStyles;

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  children,
  className,
  style,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & { side?: SheetSide }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop {...applyHost(undefined, undefined, styles.backdrop)} />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        {...applyHost(className, style, styles.content, elevation.lg, sideStyles[side])}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Cerrar"
          {...applyHost(undefined, undefined, styles.close)}
        >
          <XIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.closeIcon)} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sheet-header" {...applyHost(className, style, styles.header)} {...props} />
  );
}

function SheetBody({ className, style, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-body" {...applyHost(className, style, styles.body)} {...props} />;
}

function SheetFooter({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sheet-footer" {...applyHost(className, style, styles.footer)} {...props} />
  );
}

function SheetTitle({ className, style, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      {...applyHost(className, style, styles.title)}
      {...props}
    />
  );
}

function SheetDescription({ className, style, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      {...applyHost(className, style, styles.description)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  sideStyles as sheetVariants,
};
