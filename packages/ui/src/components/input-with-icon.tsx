import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";

import { Input, type InputProps } from "#components/input";
import type { Icon } from "#lib/icon";
import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

type EndAdornment =
  | {
      /** Decorative icon rendered at the end of the input. */
      endIcon?: Icon;
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
    startIcon?: Icon;
  };

const styles = stylex.create({
  root: {
    position: "relative",
  },
  icon: {
    pointerEvents: "none",
    position: "absolute",
    top: "50%",
    width: "1rem",
    height: "1rem",
    translate: "0 -50%",
    color: colors.mutedForeground,
  },
  startIcon: {
    left: "0.75rem",
  },
  endIcon: {
    right: "0.75rem",
  },
  endAction: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
  },
});

function InputWithIcon({
  className,
  style,
  endAction,
  endIcon: EndIcon,
  startIcon: StartIcon,
  ...props
}: InputWithIconProps) {
  const hasEndAction = endAction != null;

  return (
    <div
      data-slot="input-with-icon"
      data-has-start={StartIcon != null ? "true" : undefined}
      data-has-end={EndIcon != null ? "true" : undefined}
      data-has-end-action={hasEndAction ? "true" : undefined}
      {...applyHost(undefined, undefined, styles.root)}
    >
      <Input className={className} style={style} {...props} />
      {StartIcon == null ? null : (
        <StartIcon
          aria-hidden="true"
          data-slot="input-start-icon"
          {...applyHost(undefined, undefined, styles.icon, styles.startIcon)}
        />
      )}
      {EndIcon == null ? null : (
        <EndIcon
          aria-hidden="true"
          data-slot="input-end-icon"
          {...applyHost(undefined, undefined, styles.icon, styles.endIcon)}
        />
      )}
      {hasEndAction ? (
        <div data-slot="input-end-action" {...applyHost(undefined, undefined, styles.endAction)}>
          {endAction}
        </div>
      ) : null}
    </div>
  );
}

export { InputWithIcon };
export type { InputWithIconProps };
