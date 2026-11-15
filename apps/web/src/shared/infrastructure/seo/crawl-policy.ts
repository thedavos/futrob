/**
 * What crawlers may index (SEO-01). The landing, `/pricing` and the public portal
 * (`/{organizationSlug}/{competitionKey}`, ADR-0024) are public; the signed-in area, the
 * same-origin API and invitation links (they carry tokens) are not.
 */

/** Indexable pages that exist for every deployment; published competitions are added at runtime. */
export const STATIC_PUBLIC_PATHS = ["/", "/pricing"] as const;

/**
 * First path segments of the signed-in area, the API and invitation links. Each one is also a
 * reserved organization slug, so no public portal URL starts with one of them.
 */
export const PRIVATE_PATH_SEGMENTS = [
  "api",
  "admin",
  "orgs",
  "player",
  "onboarding",
  "invitations",
  "entry-invitations",
  "roster-invitations",
] as const;

/**
 * `Disallow: /player` would also block an organization slugged `player-one`. Each segment is
 * matched exactly (`$`) or as a directory (`/`), which every major crawler supports.
 */
export function buildRobotsTxt(origin: string): string {
  const disallow = PRIVATE_PATH_SEGMENTS.flatMap((segment) => [
    `Disallow: /${segment}$`,
    `Disallow: /${segment}/`,
  ]);
  return ["User-agent: *", "Allow: /", ...disallow, "", `Sitemap: ${origin}/sitemap.xml`, ""].join(
    "\n",
  );
}

/** One indexable page beyond the static ones: a path on this origin and its last change. */
export interface SitemapEntry {
  /** Already URL-encoded, starting with `/`. */
  readonly path: string;
  /** ISO 8601. */
  readonly lastmod: string;
}

const XML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
} as const;

function isEscapable(char: string): char is keyof typeof XML_ESCAPES {
  return char in XML_ESCAPES;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (isEscapable(char) ? XML_ESCAPES[char] : char));
}

function urlEntry(loc: string, lastmod?: string): string {
  const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  return `  <url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
}

export function buildSitemapXml(origin: string, entries: readonly SitemapEntry[]): string {
  const urls = [
    ...STATIC_PUBLIC_PATHS.map((path) => urlEntry(`${origin}${path}`)),
    ...entries.map((entry) => urlEntry(`${origin}${entry.path}`, entry.lastmod)),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** Meta tag for every page that must stay out of search results. */
export const NOINDEX_META = { name: "robots", content: "noindex, nofollow" } as const;
