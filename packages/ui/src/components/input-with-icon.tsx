import type { LucideIcon } from "lucide-react";

import { Input, type InputProps } from "#components/input";
import { cn } from "#lib/utils";

type InputWithIconProps = InputProps & {
  icon: LucideIcon;
  /** Leading by default. Use `end` for trailing adornments. */
  iconPosition?: "start" | "end";
};

function InputWithIcon({
  className,
  icon: Icon,
  iconPosition = "start",
  ...props
}: InputWithIconProps) {
  const isEnd = iconPosition === "end";

  return (
    <div className="relative" data-slot="input-with-icon">
      <Icon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
          isEnd ? "right-3" : "left-3",
        )}
      />
      <Input className={cn(isEnd ? "pr-9" : "pl-9", className)} {...props} />
    </div>
  );
}

export { InputWithIcon };
export type { InputWithIconProps };
