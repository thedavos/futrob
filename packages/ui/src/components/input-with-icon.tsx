import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Input, type InputProps } from "#components/input";
import { cn } from "#lib/utils";

type EndAdornment =
  | {
      /** Decorative icon rendered at the end of the input. */
      endIcon?: LucideIcon;
      endAction?: never;
    }
  | {
      endIcon?: never;
      /** Interactive trailing control. Pass an icon-sized Button with matching density. */
      endAction?: ReactNode;
    };

type InputWithIconProps = InputProps &
  EndAdornment & {
    /** Decorative icon rendered at the start of the input. */
    startIcon?: LucideIcon;
  };

function InputWithIcon({
  className,
  endAction,
  endIcon: EndIcon,
  startIcon: StartIcon,
  ...props
}: InputWithIconProps) {
  const hasEndAction = endAction != null;

  return (
    <div className="relative" data-slot="input-with-icon">
      <Input
        className={cn(
          StartIcon != null && "pl-9",
          EndIcon != null && "pr-9",
          hasEndAction && "pr-11",
          className,
        )}
        {...props}
      />
      {StartIcon == null ? null : (
        <StartIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          data-slot="input-start-icon"
        />
      )}
      {EndIcon == null ? null : (
        <EndIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          data-slot="input-end-icon"
        />
      )}
      {hasEndAction ? (
        <div className="absolute inset-y-0 right-0 flex items-center" data-slot="input-end-action">
          {endAction}
        </div>
      ) : null}
    </div>
  );
}

export { InputWithIcon };
export type { InputWithIconProps };
