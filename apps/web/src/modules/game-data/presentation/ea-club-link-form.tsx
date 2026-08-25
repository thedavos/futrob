"use client";

import { useId, useRef, useState } from "react";
import {
  applyStyles,
  Badge,
  Button,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  typography,
} from "@futrob/ui";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  type EaSearchPlatform,
  type ExternalClubDto,
  type RequestId,
  asEaSearchPlatform,
  eaSearchPlatformFromGamePlatform,
  gamePlatformForEaSearchLogo,
  type GamePlatformDto,
} from "@futrob/api-contracts";
import { buildSupportFields } from "@/shared/presentation/support-fields.ts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import {
  eaPlatformLabel,
  eaSearchPlatforms,
  formatProviderGameEdition,
  MAX_EXTERNAL_CLUB_SEARCH_RESULTS,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { SupportErrorAlert } from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./ea-club-link-form.styles.ts";

const fieldGap = applyStyles(styles.fieldGap);
const platformTrigger = applyStyles(styles.platformTrigger);
const logo = applyStyles(styles.logo);
const platformMenu = applyStyles(styles.platformMenu);
const searchButton = applyStyles(styles.searchButton);
const results = applyStyles(styles.results);
const resultItem = applyStyles(styles.resultItem);
const crest = applyStyles(styles.crest);
const fallback = applyStyles(styles.fallback);
const chipIcon = applyStyles(styles.chipIcon);

type ClubSearchState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly query: string }
  | {
      readonly status: "success";
      readonly query: string;
      readonly clubs: readonly ExternalClubDto[];
    }
  | { readonly status: "empty"; readonly query: string }
  | {
      readonly status: "error";
      readonly query: string;
      readonly messageKey: "onboarding.club.search.rateLimited" | "onboarding.club.search.failed";
      readonly requestId?: RequestId;
      readonly retryAfterSeconds?: number;
    };

export type EaClubLinkSelection = {
  readonly providerKey: ExternalClubDto["providerKey"];
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly name: string;
  readonly imageUrl: string | null;
};

export type EaClubLinkFormProps = {
  readonly initialPlatform?: GamePlatformDto | null;
  readonly searchGameEdition: string;
  readonly selected: EaClubLinkSelection | null;
  readonly busy?: boolean;
  readonly onSelect: (club: EaClubLinkSelection) => void;
  readonly onClear: () => void;
  readonly searchExternalClubs: (input: {
    readonly query: string;
    readonly platform: EaSearchPlatform;
    readonly gameEdition: string;
  }) => Promise<readonly ExternalClubDto[]>;
};

export function EaClubLinkForm({
  initialPlatform = null,
  searchGameEdition,
  selected,
  busy = false,
  onSelect,
  onClear,
  searchExternalClubs,
}: EaClubLinkFormProps) {
  const { t } = useI18n();
  const clubNameId = useId();
  const statusId = useId();
  const queryRef = useRef<HTMLInputElement>(null);
  const searchRevision = useRef(0);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<EaSearchPlatform>(() =>
    eaSearchPlatformFromGamePlatform(initialPlatform),
  );
  const [search, setSearch] = useState<ClubSearchState>({ status: "idle" });
  const retry = useRetryAfterCountdown();

  async function searchClubs() {
    const trimmed = query.trim();
    if (!trimmed || search.status === "loading" || busy || retry.blocked) return;
    const revision = ++searchRevision.current;
    setSearch({ status: "loading", query: trimmed });
    try {
      const clubs = (
        await searchExternalClubs({
          query: trimmed,
          platform,
          gameEdition: searchGameEdition,
        })
      ).slice(0, MAX_EXTERNAL_CLUB_SEARCH_RESULTS);
      if (revision !== searchRevision.current) return;
      setSearch(
        clubs.length > 0
          ? { status: "success", query: trimmed, clubs }
          : { status: "empty", query: trimmed },
      );
    } catch (cause) {
      if (revision !== searchRevision.current) return;
      const retryAfterSeconds = GameDataClientError.is(cause) ? cause.retryAfterSeconds : undefined;
      retry.start(retryAfterSeconds);
      setSearch({
        status: "error",
        query: trimmed,
        messageKey: retryAfterSeconds
          ? "onboarding.club.search.rateLimited"
          : "onboarding.club.search.failed",
        requestId: GameDataClientError.is(cause) ? cause.requestId : undefined,
        retryAfterSeconds,
      });
    }
  }

  function invalidateClubSearch() {
    searchRevision.current += 1;
    setSearch({ status: "idle" });
  }

  function selectClub(club: ExternalClubDto) {
    onSelect({
      providerKey: club.providerKey,
      externalClubId: club.externalClubId,
      platform: club.platform,
      gameEdition: club.gameEdition,
      name: club.name,
      imageUrl: club.imageUrl,
    });
  }

  function resetClubSearch() {
    onClear();
    invalidateClubSearch();
    setQuery("");
    queryRef.current?.focus();
  }

  const canResetSearch = Boolean(query.trim()) || search.status !== "idle" || Boolean(selected);

  const liveStatus =
    search.status === "loading"
      ? t("onboarding.club.search.loadingStatus", { query: search.query })
      : search.status === "empty"
        ? t("onboarding.club.search.empty", { query: search.query })
        : search.status === "success"
          ? t("onboarding.club.search.results", { count: search.clubs.length })
          : search.status === "error"
            ? t("onboarding.club.search.failedStatus")
            : null;

  return (
    <div {...applyStyles(styles.root)}>
      <div {...applyStyles(styles.search)}>
        <Field className={fieldGap.className} style={fieldGap.style}>
          <FieldLabel htmlFor={clubNameId}>{t("onboarding.club.name.label")}</FieldLabel>
          <Input
            autoComplete="off"
            id={clubNameId}
            maxLength={80}
            onChange={(event) => {
              setQuery(event.target.value);
              if (search.status !== "idle") invalidateClubSearch();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchClubs();
              }
            }}
            placeholder={t("onboarding.club.name.placeholder")}
            ref={queryRef}
            value={query}
          />
        </Field>
        <div {...applyStyles(styles.actions)}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t("onboarding.club.reset")}
                    disabled={!canResetSearch || search.status === "loading" || busy}
                    onClick={resetClubSearch}
                    size="icon"
                    variant="outline"
                  />
                }
              >
                <ArrowCounterClockwiseIcon aria-hidden="true" strokeWidth={2} />
              </TooltipTrigger>
              <TooltipContent>{t("onboarding.club.reset")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Select
            items={[...eaSearchPlatforms]}
            onValueChange={(value) => {
              if (!value) return;
              const nextPlatform = asEaSearchPlatform(value);
              if (!nextPlatform) return;
              setPlatform(nextPlatform);
              invalidateClubSearch();
              onClear();
            }}
            value={platform}
          >
            <SelectTrigger
              aria-label={t("onboarding.club.platform.aria")}
              className={platformTrigger.className}
              data-hide-icon="true"
              style={platformTrigger.style}
            >
              <PlatformLogo
                className={logo.className}
                platform={gamePlatformForEaSearchLogo(platform)}
                style={logo.style}
              />
            </SelectTrigger>
            <SelectContent
              align="end"
              className={platformMenu.className}
              style={platformMenu.style}
            >
              {eaSearchPlatforms.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span {...applyStyles(styles.platformOption)}>
                    <PlatformLogo
                      className={logo.className}
                      platform={gamePlatformForEaSearchLogo(option.value)}
                      style={logo.style}
                    />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className={searchButton.className}
            disabled={!query.trim() || search.status === "loading" || busy || retry.blocked}
            onClick={() => void searchClubs()}
            style={searchButton.style}
            variant="outline"
          >
            {search.status === "loading"
              ? t("onboarding.club.search.loading")
              : retry.blocked
                ? t("onboarding.club.search.retry", { seconds: retry.remainingSeconds })
                : t("onboarding.club.search.action")}
          </Button>
        </div>
      </div>

      <div aria-live="polite" id={statusId} {...applyStyles(typography.caption, styles.status)}>
        {liveStatus}
      </div>

      {search.status === "error" ? (
        <SupportErrorAlert
          copy={{
            retryAfter: (seconds) => t("support.retryAfter", { seconds }),
            codeLabel: t("support.codeLabel"),
            copyAria: t("support.copy.aria"),
            copyAction: t("support.copy.action"),
            copyDone: t("support.copy.done"),
            copySuccess: t("support.copy.success"),
            copyFailure: t("support.copy.failure"),
          }}
          error={{
            message: t(search.messageKey),
            ...buildSupportFields({
              requestId: search.requestId,
              retryAfterSeconds: retry.remainingSeconds || undefined,
            }),
          }}
        />
      ) : null}

      {search.status === "success" ? (
        <ChoiceGroup
          aria-describedby={statusId}
          aria-label={t("onboarding.club.results.aria")}
          className={results.className}
          onValueChange={(value: string) => {
            const club = search.clubs.find((item) => item.externalClubId === value);
            if (club) selectClub(club);
          }}
          style={results.style}
          value={selected?.externalClubId ?? ""}
        >
          {search.clubs.map((club) => (
            <ChoiceGroupItem
              className={resultItem.className}
              key={club.externalClubId}
              style={resultItem.style}
              value={club.externalClubId}
            >
              <ChoiceGroupIndicator />
              <ClubCrestAvatar
                className={crest.className}
                fallbackClassName={fallback.className}
                imageUrl={club.imageUrl}
                name={club.name}
                style={crest.style}
              />
              <span {...applyStyles(styles.resultCopy)}>
                <span {...applyStyles(styles.resultName)}>{club.name}</span>
                <ClubMetaChips gameEdition={club.gameEdition} platform={club.platform} />
              </span>
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
      ) : null}

      {selected && search.status !== "success" ? (
        <div {...applyStyles(styles.selected)}>
          <ClubCrestAvatar
            className={crest.className}
            fallbackClassName={fallback.className}
            imageUrl={selected.imageUrl}
            name={selected.name}
            style={crest.style}
          />
          <div {...applyStyles(styles.resultCopy)}>
            <p {...applyStyles(styles.resultName)}>{selected.name}</p>
            <ClubMetaChips gameEdition={selected.gameEdition} platform={selected.platform} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClubMetaChips({
  platform,
  gameEdition,
}: {
  readonly platform: string;
  readonly gameEdition: string;
}) {
  const eaPlatform = asEaSearchPlatform(platform);
  return (
    <span {...applyStyles(styles.chips)}>
      <Badge variant="outline">
        {eaPlatform ? (
          <PlatformLogo
            className={chipIcon.className}
            platform={gamePlatformForEaSearchLogo(eaPlatform)}
            style={chipIcon.style}
          />
        ) : null}
        {eaPlatformLabel(platform)}
      </Badge>
      <Badge variant="outline">
        <EaLogo className={chipIcon.className} style={chipIcon.style} />
        {formatProviderGameEdition(gameEdition)}
      </Badge>
    </span>
  );
}
