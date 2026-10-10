"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { OrganizationLogoDto } from "@futrob/api-contracts";
import { applyStyles, Avatar, AvatarFallback, AvatarImage } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { organizationLogoUrl, organizationMonogram } from "./organization-logo.ts";

const styles = stylex.create({
  sm: { width: "1.5rem", height: "1.5rem" },
  md: { width: "2.5rem", height: "2.5rem" },
  lg: { width: "4rem", height: "4rem" },
  bareImage: {
    display: "block",
    objectFit: "contain",
    backgroundColor: "transparent",
  },
});

const sizeStyles = { sm: styles.sm, md: styles.md, lg: styles.lg } as const;

/**
 * The organization's logo, or its monogram when it has none (or while the image loads).
 * `previewUrl` shows a local file the user picked before it is uploaded.
 * `bare` paints an uploaded logo on the parent surface, without the avatar disc or outline.
 */
export function OrganizationAvatar({
  name,
  logo,
  previewUrl,
  size = "md",
  bare = false,
}: Readonly<{
  name: string;
  logo?: OrganizationLogoDto;
  previewUrl?: string | null;
  size?: "sm" | "md" | "lg";
  bare?: boolean;
}>) {
  const { t } = useI18n();
  const source = previewUrl ?? (logo ? organizationLogoUrl(logo) : null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = source != null && failedSource === source;
  const frame = applyStyles(sizeStyles[size]);
  const alt = t("organizations.profile.logo.alt", { name });

  if (bare && source && !failed) {
    return (
      <img
        alt={alt}
        data-outline="none"
        data-slot="organization-logo"
        onError={() => setFailedSource(source)}
        src={source}
        {...applyStyles(sizeStyles[size], styles.bareImage)}
      />
    );
  }

  return (
    <Avatar className={frame.className} style={frame.style}>
      {source && !failed ? <AvatarImage alt={alt} src={source} /> : null}
      <AvatarFallback aria-hidden="true">{organizationMonogram(name)}</AvatarFallback>
    </Avatar>
  );
}
