import { createFileRoute } from "@tanstack/react-router";
import { listPublishedCompetitionsForSitemap } from "@/modules/public-portal/server/public-portal-sitemap.ts";
import { buildSitemapXml } from "@/shared/infrastructure/seo/crawl-policy.ts";

/**
 * A published competition shows up within the shared-cache window; an unpublished one drops
 * out just as fast, because the API only lists public statuses.
 */
const SITEMAP_CACHE_CONTROL = "public, max-age=300, s-maxage=300";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const competitions = await listPublishedCompetitionsForSitemap();
        if (competitions === null) {
          // A partial sitemap would tell crawlers every portal is gone; ask them to come back.
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "no-store",
              "retry-after": "300",
            },
          });
        }
        return new Response(buildSitemapXml(new URL(request.url).origin, competitions), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": SITEMAP_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
