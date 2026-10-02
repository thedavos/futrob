"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { OrganizationLogoDto } from "@futrob/api-contracts";
import { applyStyles, Button, FieldDescription, FieldError, FieldLabel } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OrganizationAvatar } from "./organization-avatar.tsx";
import { LOGO_ACCEPT, logoFileProblem } from "./organization-logo.ts";

/** What the user picked: leave the stored logo, go back to the monogram, or upload a file. */
export type LogoChoice =
  | { readonly kind: "keep" }
  | { readonly kind: "monogram" }
  | { readonly kind: "file"; readonly file: File };

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.5rem",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
});

const row = applyStyles(styles.row);
const copy = applyStyles(styles.copy);
const actions = applyStyles(styles.actions);

/** Previews the pick locally; nothing is uploaded until the form is submitted. */
export function OrganizationLogoPicker({
  idPrefix,
  organizationName,
  currentLogo,
  choice,
  onChange,
  disabled,
}: Readonly<{
  idPrefix: string;
  organizationName: string;
  /** The stored logo, or `null` while the organization does not exist yet. */
  currentLogo: OrganizationLogoDto | null;
  choice: LogoChoice;
  onChange: (choice: LogoChoice) => void;
  disabled?: boolean;
}>) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<"invalidType" | "tooLarge" | null>(null);
  const previewUrl = useObjectUrl(choice.kind === "file" ? choice.file : null);

  const hasStoredUpload = currentLogo?.kind === "upload";
  const showsImage = choice.kind === "file" || (choice.kind === "keep" && hasStoredUpload === true);
  const inputId = `${idPrefix}-logo-file`;
  const problemId = `${idPrefix}-logo-error`;

  return (
    <div {...row}>
      <OrganizationAvatar
        logo={choice.kind === "keep" ? (currentLogo ?? undefined) : undefined}
        name={organizationName}
        previewUrl={previewUrl}
        size="lg"
      />
      <div {...copy}>
        <FieldLabel htmlFor={inputId}>{t("organizations.profile.logo.label")}</FieldLabel>
        <FieldDescription>{t("organizations.profile.logo.description")}</FieldDescription>
        <input
          accept={LOGO_ACCEPT}
          aria-describedby={problem ? problemId : undefined}
          aria-label={t("organizations.profile.logo.label")}
          hidden
          id={inputId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const found = logoFileProblem(file);
            setProblem(found);
            if (!found) onChange({ kind: "file", file });
          }}
          ref={inputRef}
          type="file"
        />
        <div {...actions}>
          <Button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {showsImage
              ? t("organizations.profile.logo.change")
              : t("organizations.profile.logo.upload")}
          </Button>
          {showsImage ? (
            <Button
              disabled={disabled}
              onClick={() => {
                setProblem(null);
                onChange({ kind: "monogram" });
              }}
              type="button"
              variant="ghost"
            >
              {t("organizations.profile.logo.remove")}
            </Button>
          ) : null}
        </div>
        {problem ? (
          <FieldError id={problemId} match>
            {problem === "invalidType"
              ? t("organizations.profile.logo.invalidType")
              : t("organizations.profile.logo.tooLarge")}
          </FieldError>
        ) : null}
      </div>
    </div>
  );
}

/** An object URL for `file`, revoked when the file changes or the component unmounts. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);
  return url;
}
