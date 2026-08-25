import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
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
    backgroundColor: "color-mix(in oklab, var(--neutral-950) 55%, transparent)",
    backdropFilter: "blur(2px)",
    transitionProperty: "opacity",
    transitionDuration: "var(--duration-normal)",
  },
  viewport: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    display: "grid",
    placeItems: "center",
    overflowY: "auto",
    padding: "1rem",
  },
  content: {
    width: "100%",
    maxWidth: "28rem",
    transformOrigin: "center",
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.popover,
    padding: "1.5rem",
    color: colors.popoverForeground,
    transitionProperty: "opacity, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    outlineWidth: 0,
    outlineStyle: "none",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    textAlign: "left",
  },
  footer: {
    marginTop: "1.5rem",
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

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogAction = AlertDialogPrimitive.Close;
const AlertDialogCancel = AlertDialogPrimitive.Close;

function AlertDialogContent({
  children,
  className,
  style,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop {...applyHost(undefined, undefined, styles.backdrop)} />
      <AlertDialogPrimitive.Viewport {...applyHost(undefined, undefined, styles.viewport)}>
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          {...applyHost(className, style, styles.content, elevation.lg)}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      {...applyHost(className, style, styles.header)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      {...applyHost(className, style, styles.footer)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, style, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      {...applyHost(className, style, styles.title)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  style,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      {...applyHost(className, style, styles.description)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
