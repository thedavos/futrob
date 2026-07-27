"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import {
  OrganizationsClientError,
  organizationsBrowserClient,
} from "@/modules/organizations/presentation/organizations-browser-client.ts";

export function CreateOrganizationForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("El nombre es obligatorio.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await organizationsBrowserClient.create({ name: trimmed });
      await navigate({ to: "/orgs/$orgId", params: { orgId: created.organizationId } });
    } catch (caught) {
      if (caught instanceof OrganizationsClientError) {
        setError(
          caught.code === "organizations.invalid_name"
            ? "El nombre no es válido."
            : "No se pudo crear la organización. Inténtalo de nuevo.",
        );
      } else {
        setError("No se pudo crear la organización. Inténtalo de nuevo.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="organization-name">Nombre de la organización</Label>
        <Input
          autoComplete="organization"
          disabled={submitting}
          id="organization-name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </div>

      <Button disabled={submitting} type="submit">
        Crear organización
      </Button>
    </form>
  );
}
