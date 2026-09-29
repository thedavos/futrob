"use client";

import { useEffect, useRef, useState } from "react";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
  discoverableCompetitionStatusSchema,
  exploreCompetitionsSortSchema,
} from "@futrob/api-contracts";
import { GAME_PLATFORM_VALUES } from "@futrob/shared-kernel";
import type { z } from "zod";
import {
  applyStyles,
  Caption,
  InputWithIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  typography,
} from "@futrob/ui";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionRegionLabel,
} from "@/modules/competitions/presentation/competition-labels.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./explore-competitions-page.styles.ts";
import {
  EXPLORE_STATUS_FILTERS,
  toExploreSearchParams,
  type ExploreCompetitionsSearch,
} from "./explore-search.ts";
import { useDebouncedValue } from "./use-debounced-value.ts";

const ALL = "__all__";
const FORMATS = competitionFormatSchema.options;
const REGIONS = competitionRegionSchema.options;
const SORTS = exploreCompetitionsSortSchema.options;
const STATUS_KEYS = {
  all: "player.competitions.explore.status.all",
  registration: "player.competitions.explore.status.registration",
  published: "player.competitions.explore.status.published",
  paused: "player.competitions.explore.status.paused",
  finished: "player.competitions.explore.status.finished",
} as const satisfies Record<string, ParameterlessMessageKey>;
const SORT_KEYS = {
  "updated-desc": "player.competitions.explore.sort.updated-desc",
  "name-asc": "player.competitions.explore.sort.name-asc",
} as const satisfies Record<(typeof SORTS)[number], ParameterlessMessageKey>;

export function ExploreCompetitionsToolbar({
  resultCount,
  search,
  onSearchChange,
  t,
}: {
  readonly resultCount?: number;
  readonly search: ExploreCompetitionsSearch;
  readonly onSearchChange: (next: ExploreCompetitionsSearch) => void;
  readonly t: Translator;
}) {
  const [query, setQuery] = useState(search.q ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchRef = useRef(search);
  const onSearchChangeRef = useRef(onSearchChange);
  searchRef.current = search;
  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const current = searchRef.current;
    const nextQuery = debouncedQuery.trim() || undefined;
    if (nextQuery === current.q) return;
    onSearchChangeRef.current(toExploreSearchParams({ ...current, q: nextQuery }));
  }, [debouncedQuery]);

  function patch(next: Partial<ExploreCompetitionsSearch>) {
    onSearchChange(toExploreSearchParams({ ...search, ...next }));
  }

  return (
    <div {...applyStyles(styles.toolbar)}>
      <div {...applyStyles(styles.toolbarRow)}>
        <div {...applyStyles(styles.search)}>
          <InputWithIcon
            aria-label={t("player.competitions.explore.search.label")}
            dense
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("player.competitions.explore.search.placeholder")}
            startIcon={MagnifyingGlassIcon}
            type="search"
            value={query}
          />
        </div>
      </div>
      <div {...applyStyles(styles.toolbarRow)}>
        <div {...applyStyles(styles.filters)}>
          <FilterSelect
            allLabel={t(STATUS_KEYS.all)}
            ariaLabel={t("player.competitions.explore.status.label")}
            items={EXPLORE_STATUS_FILTERS.map((status) => ({
              label: t(STATUS_KEYS[status]),
              value: status,
            }))}
            onChange={(value) =>
              patch({ status: parseFilterValue(discoverableCompetitionStatusSchema, value) })
            }
            value={search.status ?? ALL}
          />
          <FilterSelect
            allLabel={t("player.competitions.explore.format.all")}
            ariaLabel={t("player.competitions.explore.format.label")}
            items={FORMATS.map((format) => ({
              label: competitionFormatLabel(format, t),
              value: format,
            }))}
            onChange={(value) =>
              patch({ format: parseFilterValue(competitionFormatSchema, value) })
            }
            value={search.format ?? ALL}
          />
          <FilterSelect
            allLabel={t("player.competitions.explore.region.all")}
            ariaLabel={t("player.competitions.explore.region.label")}
            items={REGIONS.map((region) => ({
              label: competitionRegionLabel(region, t),
              value: region,
            }))}
            onChange={(value) =>
              patch({ region: parseFilterValue(competitionRegionSchema, value) })
            }
            value={search.region ?? ALL}
          />
          <FilterSelect
            allLabel={t("player.competitions.explore.platform.all")}
            ariaLabel={t("player.competitions.explore.platform.label")}
            items={GAME_PLATFORM_VALUES.map((platform) => ({
              label: competitionPlatformLabel(platform),
              value: platform,
            }))}
            onChange={(value) =>
              patch({ platform: parseFilterValue(competitionPlatformSchema, value) })
            }
            value={search.platform ?? ALL}
          />
          <Select
            itemToStringLabel={(value) =>
              value === "updated-desc" || value === "name-asc" ? t(SORT_KEYS[value]) : ""
            }
            items={SORTS.map((sort) => ({
              label: t(SORT_KEYS[sort]),
              value: sort,
            }))}
            onValueChange={(value) => {
              if (value === "updated-desc" || value === "name-asc") {
                patch({ sort: value });
              }
            }}
            value={search.sort ?? "updated-desc"}
          >
            <SelectTrigger
              aria-label={t("player.competitions.explore.sort.label")}
              className={styles.filter}
              dense
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(SORT_KEYS[sort])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {resultCount === undefined ? null : (
          <Caption role="status" {...applyStyles(typography.caption, styles.count)}>
            {t("player.competitions.explore.count", { count: resultCount })}
          </Caption>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  allLabel,
  ariaLabel,
  items,
  onChange,
  value,
}: {
  readonly allLabel: string;
  readonly ariaLabel: string;
  readonly items: readonly { readonly label: string; readonly value: string }[];
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  const options = [{ label: allLabel, value: ALL }, ...items];
  return (
    <Select
      itemToStringLabel={(item) => options.find((option) => option.value === item)?.label ?? ""}
      items={options}
      onValueChange={(next) => {
        if (next === ALL || next === undefined || next === null) {
          onChange(ALL);
          return;
        }
        const match = options.find((option) => option.value === next);
        if (match) onChange(match.value);
      }}
      value={value}
    >
      <SelectTrigger aria-label={ariaLabel} className={styles.filter} dense>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function parseFilterValue<T>(schema: z.ZodType<T>, value: string): T | undefined {
  if (value === ALL) return undefined;
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
