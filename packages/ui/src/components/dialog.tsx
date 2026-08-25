import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
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
    position: "relative",
    width: "100%",
    maxWidth: "32rem",
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
    paddingRight: "2.5rem",
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

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogBackdrop({ className, style, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      {...applyProps(className, style, styles.backdrop)}
      {...props}
    />
  );
}

type DialogContentProps = DialogPrimitive.Popup.Props & {
  hideClose?: boolean;
};

function DialogContent({
  children,
  className,
  style,
  hideClose = false,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport {...applyProps(undefined, undefined, styles.viewport)}>
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          {...applyProps(className, style, styles.content, elevation.lg)}
          {...props}
        >
          {children}
          {!hideClose && (
            <DialogPrimitive.Close
              aria-label="Cerrar"
              {...applyProps(undefined, undefined, styles.close)}
            >
              <XIcon aria-hidden="true" {...applyProps(undefined, undefined, styles.closeIcon)} />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" {...applyProps(className, style, styles.header)} {...props} />
  );
}

function DialogFooter({ className, style, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="dialog-footer" {...applyProps(className, style, styles.footer)} {...props} />
  );
}

function DialogTitle({ className, style, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      {...applyProps(className, style, styles.title)}
      {...props}
    />
  );
}

function DialogDescription({ className, style, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      {...applyProps(className, style, styles.description)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
export type { DialogContentProps };
