import { Select, SelectContent, SelectItem, SelectTrigger } from "@futrob/ui";
import { useI18n } from "./i18n-provider.tsx";
import type { Locale } from "./catalogs.ts";

export function LocaleSelect() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Select
      items={[
        { label: t("locale.es"), value: "es" },
        { label: t("locale.en"), value: "en" },
      ]}
      onValueChange={(value) => value && void setLocale(value as Locale)}
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
