import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import {
  formatLegalUpdatedOn,
  LEGAL_HREFS,
  LEGAL_PUBLIC_ORIGIN,
  LEGAL_UPDATED_ON,
  legalNavItems,
  publicLegalUrl,
} from "./legal-hrefs.ts";

describe("legal hrefs", () => {
  it("keeps a single public path per document", () => {
    expect(LEGAL_HREFS.terms).toBe("/terms");
    expect(LEGAL_HREFS.privacy).toBe("/privacy");
    expect(LEGAL_HREFS.refunds).toBe("/refunds");
    expect(LEGAL_HREFS.accountDeletion).toBe("/privacy#account-deletion");
  });

  it("labels the footer and account menu in Spanish and English", () => {
    expect(legalNavItems(createTranslator("es")).map((item) => item.label)).toEqual([
      "Términos de servicio",
      "Política de privacidad",
      "Reembolsos",
    ]);
    expect(legalNavItems(createTranslator("en")).map((item) => item.label)).toEqual([
      "Terms of service",
      "Privacy policy",
      "Refunds",
    ]);
  });

  it("formats the last-updated date in UTC for both locales", () => {
    expect(LEGAL_UPDATED_ON).toBe("2026-11-10");
    expect(formatLegalUpdatedOn("es")).toBe("10 de noviembre de 2026");
    expect(formatLegalUpdatedOn("en")).toBe("November 10, 2026");
  });

  it("builds the public store URL for native clients", () => {
    expect(publicLegalUrl(LEGAL_HREFS.privacy)).toBe(`${LEGAL_PUBLIC_ORIGIN}/privacy`);
  });
});
