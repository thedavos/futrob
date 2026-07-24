"use client";

import { useState, type FormEvent } from "react";
import type { ExternalClubDto } from "@futrob/api-contracts";
import { Button } from "@futrob/ui";
import { FutrobApiError } from "@futrob/sdk";
import {
  getFutrobBrowserClient,
  resolveFutrobApiBaseUrl,
} from "@/shared/infrastructure/http/futrob-browser-client.ts";

const PLATFORMS = [
  { value: "nx", label: "Nintendo Switch (nx)" },
  { value: "common-gen5", label: "Cross-gen (common-gen5)" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "xbox", label: "Xbox" },
] as const;

export function ClubSearchPanel() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<string>("nx");
  const [clubs, setClubs] = useState<ExternalClubDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getFutrobBrowserClient().gameData.clubs.search({
        query: trimmed,
        platform,
      });
      setClubs(result.clubs);
      setSearched(true);
    } catch (cause) {
      setClubs([]);
      setSearched(true);
      if (cause instanceof FutrobApiError) {
        setError(`${cause.messageKey} (HTTP ${cause.status})`);
      } else if (cause instanceof TypeError) {
        setError(`No se pudo conectar a ${resolveFutrobApiBaseUrl()}. ¿Está corriendo apps/api?`);
      } else {
        setError("No se pudo buscar clubs.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[0_0_0_1px_var(--border)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="type-label text-muted-foreground">Game data · EA Clubs</p>
          <h2 className="type-title mt-1">Buscar clubs</h2>
        </div>
        <span className="type-label rounded-full bg-muted px-3 py-1 text-muted-foreground">
          Live API
        </span>
      </div>

      <form className="grid gap-3 px-5 py-5 sm:px-6" onSubmit={onSubmit}>
        <label className="grid gap-1.5">
          <span className="type-label text-muted-foreground">Nombre del club</span>
          <input
            autoComplete="off"
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-180 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            name="query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. Cuervos"
            value={query}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="type-label text-muted-foreground">Plataforma</span>
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-180 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            name="platform"
            onChange={(event) => setPlatform(event.target.value)}
            value={platform}
          >
            {PLATFORMS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={loading || !query.trim()}
          type="submit"
        >
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      <div className="border-t border-border bg-muted/40 px-5 py-4 sm:px-6">
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!error && searched && clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados para esa búsqueda.</p>
        ) : null}

        {!error && clubs.length > 0 ? (
          <ul className="grid gap-2">
            {clubs.map((club) => (
              <li
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-background px-3 py-2 shadow-[0_0_0_1px_var(--border)]"
                key={`${club.providerKey}:${club.externalClubId}`}
              >
                <div>
                  <strong className="text-sm sm:text-base">{club.name}</strong>
                  <p className="type-label mt-0.5 text-muted-foreground">
                    {club.platform} · {club.gameEdition}
                  </p>
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
            Consume <code className="text-xs">apps/api</code> vía SDK (
            <code className="text-xs">/game-data/clubs/search</code>).
          </p>
        ) : null}
      </div>
    </div>
  );
}
