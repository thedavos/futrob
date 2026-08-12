import { describe, expect, it } from "vite-plus/test";
import { catalogs, type Locale, type MessageParamsByKey } from "./catalogs.ts";
import { resolveLocale } from "./locale.ts";
import { createTranslator } from "./translate.ts";
import { onboardingHead } from "./onboarding-head.ts";

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

  it("requires parameters for dynamic messages at compile time", () => {
    const t = createTranslator("en");
    const retryParamsContract: Equal<
      MessageParamsByKey["onboarding.review.retry"],
      { readonly seconds: number }
    > = true;
    expect(t("onboarding.review.retry", { seconds: 3 })).toBe("Try again in 3s");
    expect(retryParamsContract).toBe(true);
  });

  it("builds localized route titles for server rendering", () => {
    expect(onboardingHead("es", "onboarding.account.title")).toEqual({
      meta: [{ title: "Configura tus datos de juego | Futrob" }],
    });
    expect(onboardingHead("en", "onboarding.account.title")).toEqual({
      meta: [{ title: "Set up your game details | Futrob" }],
    });
  });
});

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
