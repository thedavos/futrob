"use client";

import { applyStyles, Button, typography, useCopyToClipboard, vis } from "@futrob/ui";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./competition-team-actions.styles.ts";

const copy = applyStyles(styles.copy);

/** The link just created for a roster invitation, with its copy action. */
export function InvitationLinkPanel({
  url,
  showDescription = false,
}: Readonly<{ url: string; showDescription?: boolean }>) {
  const { t } = useI18n();
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  return (
    <div {...applyStyles(styles.created)}>
      <p {...applyStyles(typography.label, styles.createdLabel)}>{t("roster.link.title")}</p>
      <p {...applyStyles(styles.createdUrl)}>{url}</p>
      {showDescription ? (
        <p {...applyStyles(typography.caption, styles.createdLabel)}>
          {t("roster.link.description")}
        </p>
      ) : null}
      <Button
        className={copy.className}
        onClick={() => void copyToClipboard(url)}
        style={copy.style}
        variant="outline"
      >
        {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {isCopied ? t("roster.link.copied") : t("roster.link.copy")}
      </Button>
      <span aria-live="polite" {...applyStyles(vis.srOnly)}>
        {isCopied ? t("roster.link.copiedStatus") : ""}
      </span>
    </div>
  );
}
