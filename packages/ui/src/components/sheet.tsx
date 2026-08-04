import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "#lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  "fixed z-50 flex bg-popover text-popover-foreground smooth-shadow-ring-lg transition-[opacity,translate] duration-(--duration-slow) ease-(--ease-emphasized) outline-none data-ending-style:opacity-0 data-starting-style:opacity-0",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[85dvh] flex-col data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
        right:
          "inset-y-0 right-0 w-[min(26rem,90vw)] flex-col data-ending-style:translate-x-full data-starting-style:translate-x-full",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] flex-col data-ending-style:translate-y-full data-starting-style:translate-y-full",
        left: "inset-y-0 left-0 w-[min(26rem,90vw)] flex-col data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

function SheetContent({
  children,
  className,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-neutral-950/45 transition-opacity duration-(--duration-normal) data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Cerrar"
          className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          <X aria-hidden="true" className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-2 border-b border-border p-5 pr-16", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto p-5", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border p-5 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
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
  sheetVariants,
};
