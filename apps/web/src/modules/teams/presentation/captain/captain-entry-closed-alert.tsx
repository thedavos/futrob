"use client";

import { Alert, AlertDescription, AlertTitle } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

/** Shown when the API would refuse every roster change because the entry was rejected. */
export function CaptainEntryClosedAlert() {
  const { t } = useI18n();
  return (
    <Alert>
      <AlertTitle>{t("captain.entryClosed.title")}</AlertTitle>
      <AlertDescription>{t("captain.entryClosed.description")}</AlertDescription>
    </Alert>
  );
}
