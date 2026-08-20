import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@futrob/ui";
import { useI18n } from "./i18n-provider.tsx";
import { SUPPORTED_LOCALES } from "./catalogs.ts";

const localeSchema = z.enum(SUPPORTED_LOCALES);

export function LocaleSelect() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Select
      items={[
        { label: t("locale.es"), value: "es" },
        { label: t("locale.en"), value: "en" },
      ]}
      onValueChange={(value) => {
        const parsed = localeSchema.safeParse(value);
        if (parsed.success) void setLocale(parsed.data);
      }}
      value={locale}
    >
      <SelectTrigger aria-label={t("locale.label")} className="w-auto min-w-32">
        {locale === "es" ? t("locale.es") : t("locale.en")}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es">{t("locale.es")}</SelectItem>
        <SelectItem value="en">{t("locale.en")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
