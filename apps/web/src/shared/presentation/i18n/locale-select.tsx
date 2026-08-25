import { z } from "zod";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Select, SelectContent, SelectItem, SelectTrigger } from "@futrob/ui";
import { useI18n } from "./i18n-provider.tsx";
import { SUPPORTED_LOCALES } from "./catalogs.ts";

const localeSchema = z.enum(SUPPORTED_LOCALES);

const styles = stylex.create({
  trigger: {
    width: "auto",
    minWidth: "8rem",
  },
});

export function LocaleSelect() {
  const { locale, setLocale, t } = useI18n();
  const trigger = applyStyles(styles.trigger);
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
      <SelectTrigger aria-label={t("locale.label")} className={trigger.className} style={trigger.style}>
        {locale === "es" ? t("locale.es") : t("locale.en")}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es">{t("locale.es")}</SelectItem>
        <SelectItem value="en">{t("locale.en")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
