import { describe, expect, it } from "vite-plus/test";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { portalHead, portalSectionAt } from "./public-portal-meta.ts";

const t = createTranslator("es");
const ref = { organizationSlug: "liga-norte", competitionKey: "copa-1" };
const competition = { name: "Copa Barranco", coverPreset: "league" as const };

function metaContent(head: ReturnType<typeof portalHead>, key: string): string | undefined {
  const tag = head.meta.find(
    (meta) =>
      ("name" in meta && meta.name === key) || ("property" in meta && meta.property === key),
  );
  return tag && "content" in tag ? tag.content : undefined;
}

describe("portal head", () => {
  it("titles each section and points the canonical and og:url at that section", () => {
    const head = portalHead({
      origin: "https://futrob.app",
      ref,
      competition,
      section: "standings",
      t,
    });

    expect(head.meta[0]).toEqual({ title: "Tabla · Copa Barranco | Futrob" });
    expect(head.links).toEqual([
      { rel: "canonical", href: "https://futrob.app/liga-norte/copa-1/standings" },
    ]);
    expect(metaContent(head, "og:url")).toBe("https://futrob.app/liga-norte/copa-1/standings");
    expect(metaContent(head, "og:title")).toBe("Tabla · Copa Barranco | Futrob");
    expect(metaContent(head, "description")).toContain("Copa Barranco");
  });

  it("uses the competition name alone on the cover and previews with its absolute cover image", () => {
    const head = portalHead({ origin: "https://futrob.app", ref, competition, section: null, t });

    expect(head.meta[0]).toEqual({ title: "Copa Barranco | Futrob" });
    expect(head.links[0]?.href).toBe("https://futrob.app/liga-norte/copa-1");
    expect(metaContent(head, "og:image")).toMatch(/^https:\/\/futrob\.app\/.+|^data:/);
    expect(metaContent(head, "og:image")).toBe(metaContent(head, "twitter:image"));
    expect(metaContent(head, "og:image:alt")).toBe("Copa Barranco");
  });
});

describe("portalSectionAt", () => {
  it("reads the section from the pathname, ignoring a trailing slash", () => {
    expect(portalSectionAt(ref, "/liga-norte/copa-1/")).toBe("cover");
    expect(portalSectionAt(ref, "/liga-norte/copa-1/rules")).toBe("rules");
    expect(portalSectionAt(ref, "/liga-norte/otra/rules")).toBeNull();
  });
});
