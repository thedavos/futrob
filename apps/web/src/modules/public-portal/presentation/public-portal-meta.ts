import type { PublicCompetitionDto } from "@futrob/api-contracts";
import { COMPETITION_COVER_ASSETS } from "@/modules/competitions/presentation/competition-cover-assets.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  PORTAL_SECTIONS,
  portalPath,
  type PortalRef,
  type PortalSection,
} from "./public-portal-model.ts";

const SECTION_TITLE_KEYS = {
  cover: "portal.section.cover",
  calendar: "portal.section.calendar",
  standings: "portal.section.standings",
  bracket: "portal.section.bracket",
  teams: "portal.section.teams",
  rankings: "portal.section.rankings",
  rules: "portal.section.rules",
} as const satisfies Record<PortalSection, string>;

/** Section a pathname renders, or null when it is not one of this competition's portal pages. */
export function portalSectionAt(ref: PortalRef, pathname: string): PortalSection | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PORTAL_SECTIONS.find((section) => portalPath(ref, section) === normalized) ?? null;
}

/** Pixel size of the bundled cover illustrations: square presets, a portrait classic trophy. */
const COVER_SIZE = { width: 1254, height: 1254 } as const;
const CLASSIC_COVER_SIZE = { width: 526, height: 640 } as const;

function absolute(origin: string, src: string): string {
  return /^(https?:|data:)/.test(src) ? src : `${origin}${src}`;
}

/**
 * `<head>` of a portal page (SEO-01): its own title, a canonical URL without query, and Open
 * Graph / Twitter tags with the competition cover. Child tags replace the root defaults by
 * name/property, so a shared link never previews as the generic Futrob card.
 */
export function portalHead(input: {
  readonly origin: string;
  readonly ref: PortalRef;
  readonly competition: Pick<PublicCompetitionDto, "name" | "coverPreset">;
  readonly section: PortalSection | null;
  readonly t: Translator;
}) {
  const { origin, ref, competition, t } = input;
  const section = input.section ?? "cover";
  const title =
    section === "cover"
      ? `${competition.name} | Futrob`
      : `${t(SECTION_TITLE_KEYS[section])} · ${competition.name} | Futrob`;
  const description = t("portal.meta.description", { name: competition.name });
  const url = `${origin}${portalPath(ref, section)}`;
  const image = absolute(origin, COMPETITION_COVER_ASSETS[competition.coverPreset ?? "cup"].src);
  const imageSize = competition.coverPreset === "classic" ? CLASSIC_COVER_SIZE : COVER_SIZE;
  const imageAlt = competition.name;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:image:width", content: String(imageSize.width) },
      { property: "og:image:height", content: String(imageSize.height) },
      { property: "og:image:alt", content: imageAlt },
      // The cover is not a 1.91:1 banner, so it previews as a small card.
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
