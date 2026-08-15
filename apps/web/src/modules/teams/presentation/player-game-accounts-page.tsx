"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Link } from "@tanstack/react-router";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM_VALUES } from "@futrob/shared-kernel";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useAddMyGameAccountMutation, useMyPlayerProfileQuery } from "./player-queries.ts";

const GAME_PLATFORMS = GAME_PLATFORM_VALUES;

type AddGameAccountValues = {
  identifier: string;
  platform: string;
  gameEdition: string;
};

type AddGameAccountField = keyof AddGameAccountValues;

function isGamePlatform(value: string): value is GamePlatformDto {
  return (GAME_PLATFORMS as readonly string[]).includes(value);
}

export function PlayerGameAccountsPage() {
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const validation = useFormValidation<AddGameAccountField>();
  const profileQuery = useMyPlayerProfileQuery();
  const addAccount = useAddMyGameAccountMutation();

  const accounts = profileQuery.data?.gameAccounts ?? [];
  const loading = profileQuery.isPending;
  const submitting = addAccount.isPending;

  async function handleSubmit(formValues: AddGameAccountValues) {
    const identifier = formValues.identifier.trim();
    const gameEdition = formValues.gameEdition.trim();
    const platform = formValues.platform;

    if (!isGamePlatform(platform)) {
      validation.applyServerErrors({ platform: "Selecciona una plataforma." });
      return;
    }

    setError(null);
    validation.clearServerErrors();

    try {
      await addAccount.mutateAsync({
        identifier,
        platform,
        gameEdition,
      });
      setFormKey((current) => current + 1);
      validation.clearServerErrors();
    } catch {
      setError("No se pudo guardar la cuenta. Inténtalo de nuevo.");
    }
  }

  return (
    <main className="w-full">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="typo-label text-muted-foreground">Espacio personal</p>
          <h1 className="typo-heading">Datos de juego</h1>
          <p className="typo-subtitle text-muted-foreground">
            Registra tus identificadores de EA sin compartir credenciales. Futrob los usará para
            localizar tus partidos y estadísticas.
          </p>
        </div>
        <Button render={<Link to="/player" />} variant="link">
          Volver al espacio personal
        </Button>
      </div>

      {error || profileQuery.isError ? (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>
            {error ?? "No se pudieron cargar tus cuentas de juego."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Añadir cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <Form<AddGameAccountValues>
            aria-busy={submitting}
            className="grid gap-5"
            errors={validation.formErrors}
            key={formKey}
            onFormSubmit={handleSubmit}
          >
            <Field
              {...validation.getFieldValidationProps("identifier")}
              disabled={submitting}
              name="identifier"
              validate={(value) =>
                readFormString(value).trim().length === 0 ? "Escribe el identificador de EA." : null
              }
            >
              <FieldLabel htmlFor="player-account-identifier">Identificador de EA</FieldLabel>
              <Input
                disabled={submitting}
                id="player-account-identifier"
                maxLength={80}
                name="identifier"
              />
              <FieldError />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                {...validation.getFieldValidationProps("platform")}
                disabled={submitting}
                name="platform"
                validate={(value) =>
                  readFormString(value).length === 0 ? "Selecciona una plataforma." : null
                }
              >
                <FieldLabel htmlFor="player-account-platform">Plataforma</FieldLabel>
                <Select disabled={submitting} name="platform">
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
                <FieldError />
              </Field>
              <Field
                {...validation.getFieldValidationProps("gameEdition")}
                disabled={submitting}
                name="gameEdition"
                validate={(value) =>
                  readFormString(value).trim().length === 0 ? "Escribe la edición." : null
                }
              >
                <FieldLabel htmlFor="player-account-edition">Edición</FieldLabel>
                <Input
                  disabled={submitting}
                  id="player-account-edition"
                  maxLength={40}
                  name="gameEdition"
                  placeholder="ej. FC 26"
                />
                <FieldError />
              </Field>
            </div>
            <Button className="w-full sm:w-fit" disabled={submitting} type="submit">
              {submitting ? "Guardando…" : "Añadir cuenta"}
            </Button>
          </Form>
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
