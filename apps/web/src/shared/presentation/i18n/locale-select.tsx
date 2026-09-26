import { z } from "zod";
import * as stylex from "@stylexjs/stylex";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "./i18n-provider.tsx";
import { SUPPORTED_LOCALES } from "./catalogs.ts";

const localeSchema = z.enum(SUPPORTED_LOCALES);

const styles = stylex.create({
  trigger: {
    width: "max-content",
    minWidth: 0,
    justifyContent: "flex-start",
    whiteSpace: "nowrap",
    borderColor: {
      default: "transparent",
      ":focus-visible": colors.ring,
    },
    backgroundColor: {
      default: "transparent",
      ":hover": colors.muted,
      ':is([aria-expanded="true"])': colors.muted,
    },
  },
});

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
      <SelectTrigger aria-label={t("locale.label")} className={styles.trigger} dense>
        {locale === "es" ? t("locale.es") : t("locale.en")}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="es">{t("locale.es")}</SelectItem>
        <SelectItem value="en">{t("locale.en")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
