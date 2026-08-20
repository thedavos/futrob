"use client";

import { useId, useRef, useState } from "react";
import {
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

const clubResultItemClassName =
  "min-h-0 flex-row items-center justify-start gap-4 rounded-xl py-3 pr-14 pl-3 text-left sm:min-h-0 sm:flex-row sm:items-center sm:justify-start sm:gap-4 sm:p-3 sm:pr-14 sm:text-left";

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
    <div className="grid w-full gap-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field className="gap-3">
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
        <div className="flex items-center gap-2 max-sm:w-full">
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
              className="size-(--control-height) max-sm:size-(--control-height-touch) shrink-0 cursor-pointer justify-center gap-0 border-border-strong p-0 [&_[data-slot=select-trigger-icon]]:hidden"
            >
              <PlatformLogo className="size-4" platform={gamePlatformForEaSearchLogo(platform)} />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-52">
              {eaSearchPlatforms.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="inline-flex items-center gap-2">
                    <PlatformLogo
                      className="size-4"
                      platform={gamePlatformForEaSearchLogo(option.value)}
                    />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="min-w-0 flex-1 sm:flex-none"
            disabled={!query.trim() || search.status === "loading" || busy || retry.blocked}
            onClick={() => void searchClubs()}
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

      <div aria-live="polite" className="min-h-5 typo-caption text-muted-foreground" id={statusId}>
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
          className="grid-cols-1"
          onValueChange={(value: string) => {
            const club = search.clubs.find((item) => item.externalClubId === value);
            if (club) selectClub(club);
          }}
          value={selected?.externalClubId ?? ""}
        >
          {search.clubs.map((club) => (
            <ChoiceGroupItem
              className={clubResultItemClassName}
              key={club.externalClubId}
              value={club.externalClubId}
            >
              <ChoiceGroupIndicator />
              <ClubCrestAvatar
                className="size-12 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                fallbackClassName="text-sm"
                imageUrl={club.imageUrl}
                name={club.name}
              />
              <span className="grid min-w-0 flex-1 gap-2 text-left">
                <span className="min-w-0 truncate font-semibold leading-normal">{club.name}</span>
                <ClubMetaChips gameEdition={club.gameEdition} platform={club.platform} />
              </span>
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
      ) : null}

      {selected && search.status !== "success" ? (
        <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface px-3 py-3">
          <ClubCrestAvatar
            className="size-12 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            fallbackClassName="text-sm"
            imageUrl={selected.imageUrl}
            name={selected.name}
          />
          <div className="grid min-w-0 flex-1 gap-2 text-left">
            <p className="min-w-0 truncate font-semibold leading-normal">{selected.name}</p>
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
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">
        {eaPlatform ? (
          <PlatformLogo className="size-3.5" platform={gamePlatformForEaSearchLogo(eaPlatform)} />
        ) : null}
        {eaPlatformLabel(platform)}
      </Badge>
      <Badge variant="outline">
        <EaLogo className="size-3.5" />
        {formatProviderGameEdition(gameEdition)}
      </Badge>
    </span>
  );
}
