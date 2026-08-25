import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  root: {
    position: "relative",
    display: "flex",
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
  },
  image: {
    aspectRatio: 1,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fallback: {
    display: "flex",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    fontWeight: 500,
  },
});

function Avatar({ className, style, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      {...applyHost(className, style, styles.root)}
      {...props}
    />
  );
}

function AvatarImage({ className, style, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      {...applyHost(className, style, styles.image)}
      {...props}
    />
  );
}

function AvatarFallback({ className, style, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      {...applyHost(className, style, typography.caption, styles.fallback)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
