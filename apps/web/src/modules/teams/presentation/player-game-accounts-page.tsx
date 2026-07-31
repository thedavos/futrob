"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Label,
  Logo,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import type { GamePlatformDto, PlayerGameAccountDto } from "@futrob/api-contracts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

export function PlayerGameAccountsPage() {
  const [accounts, setAccounts] = useState<PlayerGameAccountDto[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [platform, setPlatform] = useState<GamePlatformDto | "">("");
  const [gameEdition, setGameEdition] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void teamsBrowserClient
      .getMyProfile()
      .then((result) => {
        if (!cancelled) setAccounts(result.gameAccounts);
      })
      .catch(() => {
        if (!cancelled) setError("No pudimos cargar tus cuentas de juego.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim() || !platform || !gameEdition.trim()) {
      setError("Completa identificador, plataforma y edición.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await teamsBrowserClient.addMyGameAccount({
        identifier: identifier.trim(),
        platform,
        gameEdition: gameEdition.trim(),
      });
      setAccounts((current) => {
        const withoutExisting = current.filter((account) => account.id !== result.gameAccount.id);
        return [...withoutExisting, result.gameAccount];
      });
      setIdentifier("");
      setPlatform("");
      setGameEdition("");
    } catch {
      setError("No pudimos guardar la cuenta. Inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto" />
          <span className="font-semibold tracking-wide">Futrob</span>
        </div>
        <Button render={<Link to="/player" />} variant="link">
          Volver al espacio personal
        </Button>
      </header>
      <div className="mb-8 space-y-2">
        <p className="typo-label text-muted-foreground">Espacio personal</p>
        <h1 className="typo-heading">Datos de juego</h1>
        <p className="typo-subtitle text-muted-foreground">
          Registra tus identificadores de EA sin compartir credenciales. Futrob los usará para
          localizar tus partidos y estadísticas.
        </p>
      </div>

      {error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Añadir cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
            <Field>
              <FieldLabel htmlFor="player-account-identifier">Identificador de EA</FieldLabel>
              <Input
                id="player-account-identifier"
                maxLength={80}
                onChange={(event) => setIdentifier(event.target.value)}
                value={identifier}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="player-account-platform">Plataforma</Label>
                <Select
                  onValueChange={(value) => setPlatform(value as GamePlatformDto)}
                  value={platform}
                >
                  <SelectTrigger id="player-account-platform">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playstation">PlayStation</SelectItem>
                    <SelectItem value="xbox">Xbox</SelectItem>
                    <SelectItem value="pc">PC</SelectItem>
                    <SelectItem value="nintendo-switch-1">Nintendo Switch 1</SelectItem>
                    <SelectItem value="nintendo-switch-2">Nintendo Switch 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field>
                <FieldLabel htmlFor="player-account-edition">Edición</FieldLabel>
                <Input
                  id="player-account-edition"
                  maxLength={40}
                  onChange={(event) => setGameEdition(event.target.value)}
                  placeholder="ej. FC 26"
                  value={gameEdition}
                />
              </Field>
            </div>
            <Button className="w-full sm:w-fit" disabled={submitting} type="submit">
              {submitting ? "Guardando…" : "Añadir cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Cuentas vinculadas</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando cuentas…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no vinculaste ninguna cuenta.</p>
        ) : (
          <div className="divide-y divide-border-subtle rounded-lg border border-border">
            {accounts.map((account) => (
              <div className="px-4 py-3" key={account.id}>
                <div>
                  <p className="font-semibold">{account.identifier}</p>
                  <p className="typo-caption text-muted-foreground">
                    {platformLabel(account.platform)} · {account.gameEdition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function platformLabel(platform: GamePlatformDto): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}
