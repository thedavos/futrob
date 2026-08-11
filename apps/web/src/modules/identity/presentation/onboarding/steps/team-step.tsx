"use client";

import { useId, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
import type { EaSearchPlatform, ExternalClubDto, RequestId } from "@futrob/api-contracts";
import {
  asEaSearchPlatform,
  eaSearchPlatformFromGamePlatform,
  gamePlatformForEaSearchLogo,
} from "@futrob/api-contracts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { providerGameEditionFromDraft } from "../onboarding-draft-validators.ts";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import {
  eaPlatformLabel,
  eaSearchPlatforms,
  formatProviderGameEdition,
  MAX_EXTERNAL_CLUB_SEARCH_RESULTS,
  stepsByPath,
} from "../onboarding-step-meta.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { SupportErrorAlert } from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";

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
      readonly message: string;
      readonly requestId?: RequestId;
    };

export function TeamStep() {
  const flow = useOnboardingFlow();
  const clubNameId = useId();
  const statusId = useId();
  const queryRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<EaSearchPlatform>(() =>
    eaSearchPlatformFromGamePlatform(flow.draft.platform),
  );
  const [search, setSearch] = useState<ClubSearchState>({ status: "idle" });
  const selected = flow.draft.selectedExternalClub;

  async function searchClubs() {
    const trimmed = query.trim();
    if (!trimmed || search.status === "loading" || flow.saving) return;
    setSearch({ status: "loading", query: trimmed });
    try {
      const clubs = (
        await flow.searchExternalClubs({
          query: trimmed,
          platform,
          gameEdition: providerGameEditionFromDraft(flow.draft.gameEdition),
        })
      ).slice(0, MAX_EXTERNAL_CLUB_SEARCH_RESULTS);
      setSearch(
        clubs.length > 0
          ? { status: "success", query: trimmed, clubs }
          : { status: "empty", query: trimmed },
      );
    } catch (cause) {
      setSearch({
        status: "error",
        query: trimmed,
        message: "No pudimos buscar clubs. Inténtalo nuevamente.",
        requestId: GameDataClientError.is(cause) ? cause.requestId : undefined,
      });
    }
  }

  function selectClub(club: ExternalClubDto) {
    flow.updateDraft({
      selectedExternalClub: {
        providerKey: club.providerKey,
        externalClubId: club.externalClubId,
        platform: club.platform,
        gameEdition: club.gameEdition,
        name: club.name,
        imageUrl: club.imageUrl,
      },
    });
  }

  function resetClubSearch() {
    flow.clearExternalClub();
    setSearch({ status: "idle" });
    setQuery("");
    queryRef.current?.focus();
  }

  const canResetSearch = Boolean(query.trim()) || search.status !== "idle" || Boolean(selected);

  const liveStatus =
    search.status === "loading"
      ? `Buscando clubs para «${search.query}»…`
      : search.status === "empty"
        ? `No encontramos clubs para «${search.query}».`
        : search.status === "success"
          ? `${search.clubs.length} club${search.clubs.length === 1 ? "" : "s"} encontrado${search.clubs.length === 1 ? "" : "s"}.`
          : search.status === "error"
            ? "La búsqueda falló. Puedes intentarlo de nuevo."
            : null;

  return (
    <OnboardingShell
      currentStepId="team"
      description="Busca tu club de EA Clubs para asociarlo a tu perfil. No crea un equipo de organización."
      error={flow.error}
      steps={stepsByPath.player}
      title="Asocia tu club EA"
    >
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field className="gap-3">
            <FieldLabel htmlFor={clubNameId}>Nombre del club</FieldLabel>
            <Input
              autoComplete="off"
              id={clubNameId}
              maxLength={80}
              onChange={(event) => {
                setQuery(event.target.value);
                if (search.status !== "idle" && search.status !== "loading") {
                  setSearch({ status: "idle" });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchClubs();
                }
              }}
              placeholder="ej. Night Owls"
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
                      aria-label="Restablecer búsqueda"
                      disabled={!canResetSearch || search.status === "loading" || flow.saving}
                      onClick={resetClubSearch}
                      size="icon"
                      variant="outline"
                    />
                  }
                >
                  <ArrowCounterClockwiseIcon aria-hidden="true" strokeWidth={2} />
                </TooltipTrigger>
                <TooltipContent>Restablecer búsqueda</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Select
              items={[...eaSearchPlatforms]}
              onValueChange={(value) => {
                if (!value) return;
                setPlatform(value as EaSearchPlatform);
                setSearch({ status: "idle" });
                flow.clearExternalClub();
              }}
              value={platform}
            >
              <SelectTrigger
                aria-label="Plataforma EA para la búsqueda"
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
              disabled={!query.trim() || search.status === "loading" || flow.saving}
              onClick={() => void searchClubs()}
              variant="outline"
            >
              {search.status === "loading" ? "Buscando…" : "Buscar club"}
            </Button>
          </div>
        </div>

        <div
          aria-live="polite"
          className="min-h-5 typo-caption text-muted-foreground"
          id={statusId}
        >
          {liveStatus}
        </div>

        {search.status === "error" ? <SupportErrorAlert error={search} /> : null}

        {search.status === "success" ? (
          <ChoiceGroup
            aria-describedby={statusId}
            aria-label="Resultados de clubs EA"
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
                <ClubCrest imageUrl={club.imageUrl} name={club.name} />
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
            <ClubCrest imageUrl={selected.imageUrl} name={selected.name} />
            <div className="grid min-w-0 flex-1 gap-2 text-left">
              <p className="min-w-0 truncate font-semibold leading-normal">{selected.name}</p>
              <ClubMetaChips gameEdition={selected.gameEdition} platform={selected.platform} />
            </div>
          </div>
        ) : null}
      </div>
      <OnboardingActions
        disabled={!selected}
        loading={flow.saving}
        onBack={() => void flow.goTo("game-account", "player")}
        onPrimary={() => void flow.goTo("review", "player")}
        onSkip={() => {
          flow.clearExternalClub();
          setSearch({ status: "idle" });
          setQuery("");
          void flow.goTo("review", "player");
        }}
        primaryLabel="Revisar club"
      />
    </OnboardingShell>
  );
}

function ClubCrest({
  name,
  imageUrl,
}: {
  readonly name: string;
  readonly imageUrl: string | null;
}) {
  return (
    <Avatar className="size-12 shrink-0 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
      {imageUrl ? <AvatarImage alt="" referrerPolicy="no-referrer" src={imageUrl} /> : null}
      <AvatarFallback className="text-sm">{initialsFromName(name)}</AvatarFallback>
    </Avatar>
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
