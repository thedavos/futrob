import * as stylex from "@stylexjs/stylex";
import { applyStyles, colors } from "@futrob/ui";
import { WarningCircleIcon } from "@phosphor-icons/react";

const styles = stylex.create({
  root: {
    marginTop: "0.75rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.375rem",
    fontSize: "0.75rem",
    lineHeight: 1.5,
    color: colors.danger,
  },
  icon: {
    marginTop: "0.125rem",
    width: "0.75rem",
    height: "0.75rem",
    flexShrink: 0,
  },
});

export function FieldsetError({
  id,
  children,
}: {
  readonly id: string;
  readonly children: string | null;
}) {
  const icon = applyStyles(styles.icon);
  return (
    <p id={id} {...applyStyles(styles.root)}>
      <WarningCircleIcon
        aria-hidden="true"
        className={icon.className}
        style={icon.style}
        strokeWidth={1.5}
      />
      <span>{children}</span>
    </p>
  );
}
