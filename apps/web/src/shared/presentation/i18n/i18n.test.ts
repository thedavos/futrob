import { describe, expect, it } from "vite-plus/test";
import { catalogs, type Locale } from "./catalogs.ts";
import { resolveLocale } from "./locale.ts";
import { createTranslator } from "./translate.ts";

describe("onboarding i18n", () => {
  it("keeps the English catalog in exact key parity with Spanish", () => {
    expect(Object.keys(catalogs.en).sort()).toEqual(Object.keys(catalogs.es).sort());
  });

  it("falls back to Spanish for an unsupported or missing locale", () => {
    expect(resolveLocale(undefined)).toBe("es");
    expect(resolveLocale("fr")).toBe("es");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("es_PE")).toBe("es");
    expect(resolveLocale("en")).toBe("en");
  });

  it.each([
    ["es", "2 clubs encontrados."],
    ["en", "2 clubs found."],
  ] satisfies readonly [Locale, string][])(
    "interpolates and pluralizes messages in %s",
    (locale, expected) => {
      expect(createTranslator(locale)("onboarding.club.search.results", { count: 2 })).toBe(
        expected,
      );
    },
  );

  it("returns the localized safe fallback for an unknown API error code", () => {
    expect(createTranslator("es").error("provider.unknown")).toBe(
      "No pudimos completar la operación. Inténtalo nuevamente.",
    );
    expect(createTranslator("en").error("provider.unknown")).toBe(
      "We couldn't complete the operation. Try again.",
    );
  });
});
