"use client";

import { useState } from "react";
import { EA_SEARCH_PLATFORM, type ExternalClubDto } from "@futrob/api-contracts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  readFormString,
} from "@futrob/ui";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "./game-data-browser-client.ts";
import { eaPlatformLabel, eaSearchPlatforms } from "./ea-club-search-meta.ts";
import { useSearchClubsMutation } from "./game-data-queries.ts";

type ClubSearchValues = {
  query: string;
  platform: string;
};

type ClubSearchField = keyof ClubSearchValues;

export function ClubSearchPanel() {
  const { t } = useI18n();
  const [clubs, setClubs] = useState<ExternalClubDto[]>([]);
  const [error, setError] = useState<SupportError | null>(null);
  const [searched, setSearched] = useState(false);
  const validation = useFormValidation<ClubSearchField>();
  const searchClubs = useSearchClubsMutation();
  const retry = useRetryAfterCountdown();
  const loading = searchClubs.isPending;

  async function handleSubmit(formValues: ClubSearchValues) {
    if (loading || retry.blocked) {
      return;
    }

    const trimmed = formValues.query.trim();
    const platform = formValues.platform || EA_SEARCH_PLATFORM.NINTENDO;

    setError(null);
    validation.clearServerErrors();

    try {
      const result = await searchClubs.mutateAsync({
        query: trimmed,
        platform,
      });
      setClubs(result.clubs);
      setSearched(true);
    } catch (cause) {
      setClubs([]);
      setSearched(true);
      if (GameDataClientError.is(cause)) {
        retry.start(cause.retryAfterSeconds);
        setError({
          message: cause.retryAfterSeconds
            ? "Alcanzaste el límite temporal de búsquedas."
            : "No pudimos buscar clubs. Inténtalo nuevamente.",
          requestId: cause.requestId,
          retryAfterSeconds: cause.retryAfterSeconds,
        });
      } else {
        setError({ message: "No pudimos buscar clubs. Inténtalo nuevamente." });
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="typo-label text-muted-foreground">Game data · EA Clubs</p>
          <h2 className="typo-heading mt-1">Buscar clubs</h2>
        </div>
        <span className="typo-label rounded-full bg-muted px-3 py-1 text-muted-foreground">
          Live API
        </span>
      </div>

      <Form<ClubSearchValues>
        aria-busy={loading}
        className="grid gap-3 px-5 py-5 sm:px-6"
        errors={validation.formErrors}
        onFormSubmit={handleSubmit}
      >
        <Field
          {...validation.getFieldValidationProps("query")}
          disabled={loading}
          name="query"
          validate={(value) =>
            readFormString(value).trim().length === 0 ? "Escribe el nombre del club." : null
          }
        >
          <FieldLabel>Nombre del club</FieldLabel>
          <Input autoComplete="off" disabled={loading} name="query" placeholder="Ej. Cuervos" />
          <FieldError />
        </Field>

        <Field
          {...validation.getFieldValidationProps("platform")}
          disabled={loading}
          name="platform"
        >
          <FieldLabel>Plataforma</FieldLabel>
          <Select
            defaultValue={EA_SEARCH_PLATFORM.NINTENDO}
            disabled={loading}
            items={[...eaSearchPlatforms]}
            name="platform"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eaSearchPlatforms.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button className="w-full sm:w-auto" disabled={loading || retry.blocked} type="submit">
          {loading
            ? "Buscando…"
            : retry.blocked
              ? `Reintentar en ${retry.remainingSeconds} s`
              : "Buscar"}
        </Button>
      </Form>

      <div className="border-t border-border bg-muted px-5 py-4 sm:px-6">
        {error ? (
          <SupportErrorAlert
            error={{
              ...error,
              retryAfterSeconds: retry.remainingSeconds || undefined,
            }}
          />
        ) : null}

        {!error && searched && clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados para esa búsqueda.</p>
        ) : null}

        {!error && clubs.length > 0 ? (
          <ul className="grid gap-2">
            {clubs.map((club) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-background px-3 py-2"
                key={`${club.providerKey}:${club.externalClubId}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-8">
                    {club.imageUrl ? <AvatarImage alt="" src={club.imageUrl} /> : null}
                    <AvatarFallback>{initialsFromName(club.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <strong className="text-sm sm:text-base">{club.name}</strong>
                    <p className="typo-label mt-0.5 text-muted-foreground">
                      {eaPlatformLabel(club.platform)} · {club.gameEdition}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {club.externalClubId}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {!searched && !error ? (
          <p className="typo-caption text-muted-foreground">{t("gameData.clubSearch.source")}</p>
        ) : null}
      </div>
    </div>
  );
}
