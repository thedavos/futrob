import { createFutrobClient } from "@futrob/sdk";
import { resolveProductApiBaseUrl } from "@/context/product-api-client.ts";
import type { SitemapEntry } from "@/shared/infrastructure/seo/crawl-policy.ts";
import { portalPath } from "../presentation/public-portal-model.ts";

/**
 * Portal covers of every published competition, read anonymously like the portal itself
 * (ADR-0024). Null when the API cannot answer, so the caller does not publish an empty list.
 */
export async function listPublishedCompetitionsForSitemap(): Promise<
  readonly SitemapEntry[] | null
> {
  try {
    const client = createFutrobClient({ baseUrl: resolveProductApiBaseUrl() });
    const { competitions } = await client.publicPortal.listCompetitions();
    return competitions.map((competition) => ({
      path: portalPath(competition),
      lastmod: competition.updatedAt,
    }));
  } catch {
    return null;
  }
}
