"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  asEaSearchPlatform,
  CLUB_SEARCH_QUERY_MAX_LENGTH,
  COMPETITION_SEARCH_QUERY_MAX_LENGTH,
  EA_SEARCH_PLATFORM,
  type CompetitionPlatformDto,
  type EaSearchPlatform,
  type SearchClubsQueryInput,
} from "@futrob/api-contracts";
import { GAME_PLATFORM_VALUES } from "@futrob/shared-kernel";
import {
  applyStyles,
  Button,
  Caption,
  Field,
  FieldError,
  InputWithIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  TextLink,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { competitionPlatformLabel } from "@/modules/competitions/presentation/competition-labels.ts";
import { useOpenCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import { eaSearchPlatforms } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import { usePublicSearchClubsMutation } from "@/modules/game-data/presentation/game-data-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { LandingClubResults } from "./landing-club-results.tsx";
import { LandingCompetitionResults } from "./landing-competition-results.tsx";
import { ORGANIZER_SIGNUP_SEARCH } from "./organizer-signup.ts";

type SearchKind = "club" | "competition";

/** Select value for «every platform»; competitions only, EA always searches one platform. */
const ALL_PLATFORMS = "all";

const styles = stylex.create({
  // The section centers its column; the controls and rows inside read from the start.
  root: {
    display: "grid",
    minWidth: 0,
    gap: space.s6,
    textAlign: "start",
  },
  form: {
    display: "grid",
    gap: space.s3,
  },
  // One field: the input sheds its own frame and the bar draws it around the input and «Buscar».
  bar: {
    display: "flex",
    alignItems: "center",
    gap: space.s2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.input,
      ":focus-within": colors.ring,
    },
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: space.s1,
    boxShadow: {
      default: null,
      ":focus-within": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    transitionProperty: "border-color, box-shadow",
    transitionDuration: "var(--duration-normal)",
  },
  barInvalid: {
    borderColor: colors.danger,
  },
  barInput: {
    minWidth: 0,
    flexGrow: 1,
  },
  inputBare: {
    borderWidth: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  submit: {
    flexShrink: 0,
  },
  organizer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
  },
  filters: {
    display: "grid",
    gap: space.s3,
    gridTemplateColumns: {
      default: "minmax(0, 1fr) minmax(0, 1fr)",
      [media.sm]: "repeat(2, max-content)",
    },
    justifyContent: "start",
  },
  // Same 14 px at every width (the kit's 16 px phone size is for typed text), and the caret
  // sits at the trigger's end instead of after a short value with empty space beyond it.
  trigger: {
    minWidth: 0,
    justifyContent: "flex-start",
    gap: space.s2,
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  triggerKey: {
    color: colors.mutedForeground,
  },
  triggerValue: {
    minWidth: 0,
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

/**
 * Landing search: one field for an EA club or a competition with open registration, with its
 * kind and platform chosen below. Each result signs up with what it names already chosen.
 */
export function LandingSearch() {
  const { t } = useI18n();
  const queryId = useId();
  const queryRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<SearchKind>("club");
  const [query, setQuery] = useState("");
  const [queryMissing, setQueryMissing] = useState(false);
  const [clubPlatform, setClubPlatform] = useState<EaSearchPlatform>(EA_SEARCH_PLATFORM.CROSS_GEN);
  const [competitionPlatform, setCompetitionPlatform] = useState<CompetitionPlatformDto | null>(
    null,
  );
  // The competition list follows the last submitted name, not every keystroke.
  const [competitionQuery, setCompetitionQuery] = useState("");
  const searchClubs = usePublicSearchClubsMutation();
  const retry = useRetryAfterCountdown();
  const competitions = useOpenCompetitionsQuery(
    { q: competitionQuery, platform: competitionPlatform },
    { enabled: kind === "competition" },
  );
  const searchedClubs = searchClubs.variables;
  // The club search the visitor last asked for. Results of any other search are stale: they show
  // as loading until this one answers, never under a name the field no longer holds.
  const [wantedClubs, setWantedClubs] = useState<SearchClubsQueryInput | null>(null);
  // Asked for while another search was in flight; runs as soon as that one settles.
  const queuedClubs = useRef<SearchClubsQueryInput | null>(null);
  // A competition name cut to EA's length when switching to clubs, restored on the way back.
  const clubCut = useRef<{ readonly full: string; readonly short: string } | null>(null);

  async function runClubSearch(input: SearchClubsQueryInput) {
    try {
      await searchClubs.mutateAsync(input);
    } catch (cause) {
      if (GameDataClientError.is(cause) && cause.retryAfterSeconds) {
        retry.start(cause.retryAfterSeconds);
        // Rate limited: the queued search cannot run, so this error is what the visitor sees.
        queuedClubs.current = null;
        setWantedClubs(input);
        return;
      }
    }
    const next = queuedClubs.current;
    queuedClubs.current = null;
    if (next) await runClubSearch(next);
  }

  /**
   * Asks EA for clubs named `nextQuery`. With `reuse`, a search for the same name and platform
   * that is in flight or already answered is kept instead of asked again, and whatever was queued
   * behind it is dropped: the visitor no longer wants it.
   */
  async function searchClubsFor(
    nextQuery: string,
    platform: EaSearchPlatform,
    { reuse = false }: { readonly reuse?: boolean } = {},
  ) {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      setQueryMissing(true);
      queryRef.current?.focus();
      return;
    }
    const input = { query: trimmed, platform };
    const current = searchClubs.variables;
    if (reuse && current?.query === input.query && current.platform === input.platform) {
      queuedClubs.current = null;
      setWantedClubs(input);
      return;
    }
    if (retry.blocked) return;
    setWantedClubs(input);
    if (searchClubs.isPending) {
      queuedClubs.current = input;
      return;
    }
    await runClubSearch(input);
  }

  /** Text typed before hydration is in the field but never reached `query`. */
  function typedQuery() {
    const typed = queryRef.current?.value ?? query;
    if (typed !== query) setQuery(typed);
    return typed;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = typedQuery();
    if (kind === "club") void searchClubsFor(typed, clubPlatform);
    else setCompetitionQuery(typed.trim());
  }

  function changeKind(next: SearchKind) {
    if (next === kind) return;
    setKind(next);
    setQueryMissing(false);
    let typed = typedQuery().trim();
    if (next === "competition") {
      // Back from clubs with the field untouched: the competition name gets its full length back.
      const cut = clubCut.current;
      clubCut.current = null;
      if (cut && cut.short === typed) {
        typed = cut.full;
        setQuery(typed);
      }
      setCompetitionQuery(typed);
      return;
    }
    // A competition name may run longer than EA accepts; the club field keeps EA's limit.
    if (typed.length > CLUB_SEARCH_QUERY_MAX_LENGTH) {
      const short = typed.slice(0, CLUB_SEARCH_QUERY_MAX_LENGTH).trim();
      clubCut.current = { full: typed, short };
      typed = short;
      setQuery(typed);
    }
    // EA searches are rate limited: an answered or running search for this name is reused.
    if (typed) void searchClubsFor(typed, clubPlatform, { reuse: true });
  }

  function changePlatform(value: string) {
    if (kind === "competition") {
      setCompetitionPlatform(
        value === ALL_PLATFORMS ? null : (GAME_PLATFORM_VALUES.find((p) => p === value) ?? null),
      );
      return;
    }
    const next = asEaSearchPlatform(value);
    if (!next) return;
    setClubPlatform(next);
    if (searchedClubs?.query) void searchClubsFor(searchedClubs.query, next);
  }

  const kindItems = [
    { value: "club", label: t("landing.search.kind.club") },
    { value: "competition", label: t("landing.search.kind.competition") },
  ] as const;
  const platformItems =
    kind === "club"
      ? eaSearchPlatforms.map((option) => ({ value: option.value, label: option.label }))
      : [
          { value: ALL_PLATFORMS, label: t("landing.search.allPlatforms") },
          ...GAME_PLATFORM_VALUES.map((value) => ({
            value,
            label: competitionPlatformLabel(value),
          })),
        ];
  const platformValue = kind === "club" ? clubPlatform : (competitionPlatform ?? ALL_PLATFORMS);
  const kindLabel = kindItems.find((item) => item.value === kind)?.label ?? "";
  const platformLabel = platformItems.find((item) => item.value === platformValue)?.label ?? "";
  const busy = kind === "club" ? searchClubs.isPending : competitions.isFetching;
  const blocked = kind === "club" && retry.blocked;

  return (
    <div {...applyStyles(styles.root)}>
      <form
        aria-busy={busy}
        noValidate
        onSubmit={submit}
        role="search"
        {...applyStyles(styles.form)}
      >
        <Field invalid={queryMissing}>
          <div {...applyStyles(styles.bar, queryMissing && styles.barInvalid)}>
            <div {...applyStyles(styles.barInput)}>
              <InputWithIcon
                aria-invalid={queryMissing}
                aria-label={
                  kind === "club"
                    ? t("gameData.clubSearch.queryLabel")
                    : t("landing.search.competitionQueryLabel")
                }
                autoComplete="off"
                className={styles.inputBare}
                enterKeyHint="search"
                id={queryId}
                maxLength={
                  kind === "club"
                    ? CLUB_SEARCH_QUERY_MAX_LENGTH
                    : COMPETITION_SEARCH_QUERY_MAX_LENGTH
                }
                onChange={(event) => {
                  setQuery(event.target.value);
                  setQueryMissing(false);
                }}
                placeholder={
                  kind === "club"
                    ? t("gameData.clubSearch.queryPlaceholder")
                    : t("landing.search.competitionQueryPlaceholder")
                }
                ref={queryRef}
                startIcon={MagnifyingGlassIcon}
                type="search"
                value={query}
              />
            </div>
            <Button className={styles.submit} disabled={busy || blocked} type="submit">
              {busy
                ? t("gameData.clubSearch.searching")
                : blocked
                  ? t("gameData.clubSearch.retryIn", { seconds: retry.remainingSeconds })
                  : t("gameData.clubSearch.submit")}
            </Button>
          </div>
          {queryMissing ? (
            <FieldError match>{t("gameData.clubSearch.queryRequired")}</FieldError>
          ) : null}
        </Field>

        <div {...applyStyles(styles.filters)}>
          <Select
            items={kindItems}
            onValueChange={(value) => {
              if (value === "club" || value === "competition") changeKind(value);
            }}
            value={kind}
          >
            <SelectTrigger aria-label={t("landing.search.kindLabel")} className={styles.trigger}>
              <span aria-hidden="true" {...applyStyles(styles.triggerKey)}>
                {t("landing.search.kindLabel")}
              </span>
              <span {...applyStyles(styles.triggerValue)}>{kindLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {kindItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={platformItems}
            onValueChange={(value) => {
              if (value) changePlatform(value);
            }}
            value={platformValue}
          >
            <SelectTrigger
              aria-label={t("gameData.clubSearch.platformLabel")}
              className={styles.trigger}
              disabled={kind === "club" && busy}
            >
              <span aria-hidden="true" {...applyStyles(styles.triggerKey)}>
                {t("gameData.clubSearch.platformLabel")}
              </span>
              <span {...applyStyles(styles.triggerValue)}>{platformLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {platformItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>

      <div aria-live="polite">
        {kind === "club" ? (
          <LandingClubResults
            platformLabel={platformLabel}
            rateLimitedFor={retry.remainingSeconds}
            search={searchClubs}
            wanted={wantedClubs}
          />
        ) : (
          <LandingCompetitionResults
            onShowAll={() => {
              setQuery("");
              setCompetitionQuery("");
              setCompetitionPlatform(null);
            }}
            platformLabel={competitionPlatform ? platformLabel : null}
            query={competitionQuery}
            result={competitions}
          />
        )}
      </div>

      <div {...applyStyles(styles.organizer)}>
        <Caption>{t("landing.search.organizerPrompt")}</Caption>
        <TextLink render={<Link search={ORGANIZER_SIGNUP_SEARCH} to="/signup" />} text="caption">
          {t("landing.search.organizerCta")}
        </TextLink>
      </div>
    </div>
  );
}
