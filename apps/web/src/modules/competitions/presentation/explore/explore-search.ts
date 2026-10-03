import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
  discoverableCompetitionStatusSchema,
  exploreCompetitionsQuerySchema,
  exploreCompetitionsSortSchema,
  type CompetitionFormatDto,
  type CompetitionPlatformDto,
  type CompetitionRegionDto,
  type DiscoverableCompetitionStatusDto,
  type ExploreCompetitionsQuery,
  type ExploreCompetitionsSortDto,
} from "@futrob/api-contracts";
import { hasBrowserWindow } from "@futrob/ui";
import { z } from "zod";

function optionalSearchEnum<T extends z.ZodType>(schema: T) {
  return schema.optional().catch(undefined);
}

export const exploreCompetitionsSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  format: optionalSearchEnum(competitionFormatSchema),
  status: optionalSearchEnum(discoverableCompetitionStatusSchema),
  region: optionalSearchEnum(competitionRegionSchema),
  platform: optionalSearchEnum(competitionPlatformSchema),
  sort: optionalSearchEnum(exploreCompetitionsSortSchema),
});

export type ExploreCompetitionsSearch = {
  readonly q?: string;
  readonly format?: CompetitionFormatDto;
  readonly status?: DiscoverableCompetitionStatusDto;
  readonly region?: CompetitionRegionDto;
  readonly platform?: CompetitionPlatformDto;
  readonly sort?: ExploreCompetitionsSortDto;
};

type ExploreSearchDraft = {
  q?: string;
  format?: CompetitionFormatDto;
  status?: DiscoverableCompetitionStatusDto;
  region?: CompetitionRegionDto;
  platform?: CompetitionPlatformDto;
  sort?: ExploreCompetitionsSortDto;
};

export const EXPLORE_STATUS_FILTERS = ["registration", "published", "paused", "finished"] as const;
export type ExploreStatusFilter = (typeof EXPLORE_STATUS_FILTERS)[number];

export function exploreQueryFromSearch(
  search: ExploreCompetitionsSearch,
): ExploreCompetitionsQuery {
  return exploreCompetitionsQuerySchema.parse({
    q: search.q,
    format: search.format,
    status: search.status,
    region: search.region,
    platform: search.platform,
    sort: search.sort ?? "updated-desc",
    limit: 24,
  });
}

export function toExploreSearchParams(
  search: ExploreCompetitionsSearch,
): ExploreCompetitionsSearch {
  const next: ExploreSearchDraft = {};
  if (search.q) next.q = search.q;
  if (search.format) next.format = search.format;
  if (search.status) next.status = search.status;
  if (search.region) next.region = search.region;
  if (search.platform) next.platform = search.platform;
  if (search.sort && search.sort !== "updated-desc") next.sort = search.sort;
  return next;
}

export function hasActiveExploreFilters(search: ExploreCompetitionsSearch): boolean {
  return Boolean(search.q || search.format || search.status || search.region || search.platform);
}

export function exploreCompetitionShareUrl(competitionId: string): string {
  const path = `/player/competitions/${competitionId}`;
  if (!hasBrowserWindow()) return path;
  return new URL(path, window.location.origin).href;
}

export function clearedExploreSearch(search: ExploreCompetitionsSearch): ExploreCompetitionsSearch {
  return search.sort ? { sort: search.sort } : {};
}
