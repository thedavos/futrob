"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  asEaSearchPlatform,
  CLUB_SEARCH_QUERY_MAX_LENGTH,
  EA_SEARCH_PLATFORM,
  type EaSearchPlatform,
  type ExternalClubDto,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Caption,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  FieldError,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { SupportErrorAlert } from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "./game-data-browser-client.ts";
import { eaSearchPlatforms, MAX_EXTERNAL_CLUB_SEARCH_RESULTS } from "./ea-club-search-meta.ts";
import { ClubSearchResultList } from "./club-search-result-item.tsx";
import { usePublicSearchClubsMutation } from "./game-data-queries.ts";

/** Club names that return results on EA, offered so a visitor can try the search in one tap. */
const EXAMPLE_QUERIES = ["Fera", "Real", "United"] as const;

const styles = stylex.create({
  panel: {
    display: "grid",
    minWidth: 0,
    gap: space.s5,
  },
  form: {
    display: "grid",
    gap: space.s4,
  },
  queryRow: {
    display: "grid",
    alignItems: "start",
    gap: space.s3,
    gridTemplateColumns: "minmax(0, 1fr) auto",
  },
  fieldset: {
    display: "grid",
    gap: space.s3,
    margin: 0,
    borderWidth: 0,
    padding: 0,
    minWidth: 0,
  },
  pills: {
    display: "flex",
    flexWrap: "wrap",
    gap: space.s2,
  },
  examples: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.s2,
  },
  muted: {
    color: colors.mutedForeground,
  },
});

export type ClubSearchPanelProps = {
  readonly selectedExternalClubId: string | null;
  /** `null` while a search runs, then its first result, and later the club the visitor picks. */
  readonly onSelect: (club: ExternalClubDto | null) => void;
};

/** Signed-out EA club search of the landing: query, platform pills, examples and results. */
export function ClubSearchPanel({ selectedExternalClubId, onSelect }: ClubSearchPanelProps) {
  const { t } = useI18n();
  const queryId = useId();
  const platformLegendId = useId();
  const queryRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [queryMissing, setQueryMissing] = useState(false);
  const [platform, setPlatform] = useState<EaSearchPlatform>(EA_SEARCH_PLATFORM.CROSS_GEN);
  const searchClubs = usePublicSearchClubsMutation();
  const retry = useRetryAfterCountdown();
  const loading = searchClubs.isPending;
  const searchedQuery = searchClubs.variables?.query;

  async function search(nextQuery: string, nextPlatform: EaSearchPlatform) {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      setQueryMissing(true);
      queryRef.current?.focus();
      return;
    }
    if (loading || retry.blocked) return;
    // The chosen club belongs to the previous search; its CTA must not outlive it.
    onSelect(null);
    try {
      const { clubs } = await searchClubs.mutateAsync({ query: trimmed, platform: nextPlatform });
      onSelect(clubs[0] ?? null);
    } catch (cause) {
      onSelect(null);
      if (GameDataClientError.is(cause)) retry.start(cause.retryAfterSeconds);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Text typed before hydration is in the field but never reached `query`.
    const typed = queryRef.current?.value ?? query;
    if (typed !== query) setQuery(typed);
    void search(typed, platform);
  }

  const error = searchClubs.error;
  const rateLimited = GameDataClientError.is(error) && Boolean(error.retryAfterSeconds);
  const clubs = searchClubs.data?.clubs.slice(0, MAX_EXTERNAL_CLUB_SEARCH_RESULTS) ?? [];

  return (
    <div {...applyStyles(styles.panel)}>
      <form
        aria-busy={loading}
        noValidate
        onSubmit={submit}
        role="search"
        {...applyStyles(styles.form)}
      >
        <Field invalid={queryMissing}>
          <FieldLabel htmlFor={queryId}>{t("gameData.clubSearch.queryLabel")}</FieldLabel>
          <div {...applyStyles(styles.queryRow)}>
            <Input
              aria-invalid={queryMissing}
              autoComplete="off"
              enterKeyHint="search"
              id={queryId}
              maxLength={CLUB_SEARCH_QUERY_MAX_LENGTH}
              onChange={(event) => {
                setQuery(event.target.value);
                setQueryMissing(false);
              }}
              placeholder={t("gameData.clubSearch.queryPlaceholder")}
              ref={queryRef}
              type="search"
              value={query}
            />
            <Button disabled={loading || retry.blocked} type="submit" variant="secondary">
              {loading
                ? t("gameData.clubSearch.searching")
                : retry.blocked
                  ? t("gameData.clubSearch.retryIn", { seconds: retry.remainingSeconds })
                  : t("gameData.clubSearch.submit")}
            </Button>
          </div>
          {queryMissing ? (
            <FieldError match>{t("gameData.clubSearch.queryRequired")}</FieldError>
          ) : null}
        </Field>

        <fieldset {...applyStyles(styles.fieldset)}>
          <legend id={platformLegendId} {...applyStyles(typography.label, styles.muted)}>
            {t("gameData.clubSearch.platformLabel")}
          </legend>
          <ChoiceGroup
            aria-labelledby={platformLegendId}
            onValueChange={(value: string) => {
              const next = asEaSearchPlatform(value);
              if (!next) return;
              setPlatform(next);
              if (searchedQuery) void search(searchedQuery, next);
            }}
            value={platform}
            {...applyStyles(styles.pills)}
          >
            {eaSearchPlatforms.map((option) => (
              <ChoiceGroupItem
                appearance="pill"
                disabled={loading}
                key={option.value}
                value={option.value}
              >
                {option.label}
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
        </fieldset>

        <div {...applyStyles(styles.examples)}>
          <Caption>{t("gameData.clubSearch.examples")}</Caption>
          {EXAMPLE_QUERIES.map((example) => (
            <Button
              disabled={loading || retry.blocked}
              key={example}
              onClick={() => {
                setQuery(example);
                setQueryMissing(false);
                void search(example, platform);
              }}
              type="button"
              variant="outline"
            >
              {example}
            </Button>
          ))}
        </div>
      </form>

      <div aria-live="polite">
        {error ? (
          <SupportErrorAlert
            error={{
              message: rateLimited
                ? t("gameData.clubSearch.rateLimited")
                : t("gameData.clubSearch.error"),
              requestId: GameDataClientError.is(error) ? error.requestId : undefined,
              retryAfterSeconds: retry.remainingSeconds || undefined,
            }}
          />
        ) : searchClubs.isSuccess && clubs.length === 0 ? (
          <p {...applyStyles(typography.body, styles.muted)}>{t("gameData.clubSearch.empty")}</p>
        ) : clubs.length > 0 ? (
          <ClubSearchResultList
            aria-label={t("gameData.clubSearch.results")}
            clubs={clubs}
            disabled={loading}
            onSelect={(club) => {
              const picked = clubs.find((item) => item.externalClubId === club.externalClubId);
              if (picked) onSelect(picked);
            }}
            selectedExternalClubId={selectedExternalClubId}
          />
        ) : (
          <Caption>{t("gameData.clubSearch.source")}</Caption>
        )}
      </div>
    </div>
  );
}
