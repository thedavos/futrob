"use client";

import { useState } from "react";
import type { ExternalClubDto } from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM, EA_SEARCH_PLATFORM_OPTIONS } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
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
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { GameDataClientError } from "./game-data-browser-client.ts";
import { useSearchClubsMutation } from "./game-data-queries.ts";

const PLATFORMS = EA_SEARCH_PLATFORM_OPTIONS.map((option) => ({
  value: option.value,
  label:
    option.value === EA_SEARCH_PLATFORM.NINTENDO
      ? "Nintendo Switch (nx)"
      : option.value === EA_SEARCH_PLATFORM.CROSS_GEN
        ? "Cross-gen (common-gen5)"
        : option.label,
}));

type ClubSearchValues = {
  query: string;
  platform: string;
};

type ClubSearchField = keyof ClubSearchValues;

export function ClubSearchPanel() {
  const [clubs, setClubs] = useState<ExternalClubDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const validation = useFormValidation<ClubSearchField>();
  const searchClubs = useSearchClubsMutation();
  const loading = searchClubs.isPending;

  async function handleSubmit(formValues: ClubSearchValues) {
    if (loading) {
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
        setError(`${cause.code} (HTTP ${cause.status})`);
      } else {
        setError("No se pudo buscar clubs.");
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
          <Select defaultValue={EA_SEARCH_PLATFORM.NINTENDO} disabled={loading} name="platform">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button className="w-full sm:w-auto" disabled={loading} type="submit">
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </Form>

      <div className="border-t border-border bg-muted px-5 py-4 sm:px-6">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
                      {club.platform} · {club.gameEdition}
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
          <p className="text-sm text-muted-foreground">
            Consume el BFF same-origin (
            <code className="text-xs">/api/v1/game-data/clubs/search</code>).
          </p>
        ) : null}
      </div>
    </div>
  );
}
