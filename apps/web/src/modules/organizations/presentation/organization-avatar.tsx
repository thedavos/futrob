"use client";

import * as stylex from "@stylexjs/stylex";
import type { OrganizationLogoDto } from "@futrob/api-contracts";
import { applyStyles, Avatar, AvatarFallback, AvatarImage } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { organizationLogoUrl, organizationMonogram } from "./organization-logo.ts";

const styles = stylex.create({
  sm: { width: "1.5rem", height: "1.5rem" },
  lg: { width: "4rem", height: "4rem" },
});

const sizeStyles = { sm: styles.sm, md: null, lg: styles.lg } as const;

/**
 * The organization's logo, or its monogram when it has none (or while the image loads).
 * `previewUrl` shows a local file the user picked before it is uploaded.
 */
export function OrganizationAvatar({
  name,
  logo,
  previewUrl,
  size = "md",
}: Readonly<{
  name: string;
  logo?: OrganizationLogoDto;
  previewUrl?: string | null;
  size?: "sm" | "md" | "lg";
}>) {
  const { t } = useI18n();
  const source = previewUrl ?? (logo ? organizationLogoUrl(logo) : null);
  const frame = applyStyles(sizeStyles[size]);

  return (
    <Avatar className={frame.className} style={frame.style}>
      {source ? (
        <AvatarImage alt={t("organizations.profile.logo.alt", { name })} src={source} />
      ) : null}
      <AvatarFallback aria-hidden="true">{organizationMonogram(name)}</AvatarFallback>
    </Avatar>
  );
}
