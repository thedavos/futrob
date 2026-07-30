"use client";

import { useState, type FormEvent } from "react";
import { Button, InputWithIcon, Label } from "@futrob/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import {
  AUTH_ERROR_GENERIC,
  AUTH_ERROR_NETWORK,
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_REQUIRED,
  EMAIL_PATTERN,
  isNetworkError,
  readString,
  type AuthClientError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type {
  AuthFormField,
  AuthFormState,
} from "@/modules/identity/presentation/auth-form-state.ts";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";

interface LoginValues {
  email: string;
  password: string;
}

function validateLogin(values: LoginValues): Partial<Record<AuthFormField, string>> {
  const fieldErrors: Partial<Record<AuthFormField, string>> = {};

  if (values.email.length === 0) {
    fieldErrors.email = AUTH_VALIDATION_REQUIRED;
  } else if (!EMAIL_PATTERN.test(values.email)) {
    fieldErrors.email = AUTH_VALIDATION_EMAIL;
  }

  if (values.password.length === 0) {
    fieldErrors.password = AUTH_VALIDATION_REQUIRED;
  }

  return fieldErrors;
}

function loginErrorMessage(error: AuthClientError): string {
  if (error.status === 0) {
    return AUTH_ERROR_NETWORK;
  }

  switch (error.code) {
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
    case "INVALID_EMAIL":
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "El correo o la contraseña no son correctos.";
    default:
      return AUTH_ERROR_GENERIC;
  }
}

export function LoginForm() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthFormState>({ status: "idle" });

  const emailError = state.status === "error" ? state.fieldErrors?.email : undefined;
  const passwordError = state.status === "error" ? state.fieldErrors?.password : undefined;
  const isSubmitting = state.status === "submitting" || state.status === "success";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const values: LoginValues = {
      email: readString(formData, "email").trim(),
      password: readString(formData, "password"),
    };
    const fieldErrors = validateLogin(values);

    if (Object.keys(fieldErrors).length > 0) {
      setState({ status: "error", fieldErrors });
      return;
    }

    setState({ status: "submitting" });

    try {
      const result = await authClient.signIn.email(values);

      if (result.error != null) {
        setState({ status: "error", message: loginErrorMessage(result.error) });
        return;
      }

      setState({ status: "success" });
      try {
        const { destination } = await organizationsBrowserClient.resolvePostAuthDestination();
        if (destination.kind === "organization") {
          await navigate({
            to: "/orgs/$orgId",
            params: { orgId: destination.organizationId },
          });
        } else if (destination.kind === "organizationPicker") {
          await navigate({ to: "/orgs" });
        } else if (destination.kind === "personal") {
          await navigate({ to: "/player" });
        } else {
          await navigate({ to: "/onboarding" });
        }
      } catch {
        await navigate({ to: "/onboarding" });
      }
    } catch (error) {
      setState({
        status: "error",
        message: isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  return (
    <form aria-busy={isSubmitting} className="space-y-6" noValidate onSubmit={handleSubmit}>
      {state.status === "error" && state.message != null ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <InputWithIcon
          aria-describedby={emailError == null ? undefined : "email-error"}
          aria-invalid={emailError != null}
          autoComplete="email"
          disabled={isSubmitting}
          id="email"
          name="email"
          placeholder="ejemplo@correo.com"
          startIcon={Mail}
          type="email"
        />
        {emailError == null ? null : (
          <p className="text-sm text-destructive" id="email-error">
            {emailError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <InputWithIcon
          aria-describedby={passwordError == null ? undefined : "password-error"}
          aria-invalid={passwordError != null}
          autoComplete="current-password"
          disabled={isSubmitting}
          id="password"
          name="password"
          placeholder="Ingresa tu contraseña"
          startIcon={Lock}
          type="password"
        />
        {passwordError == null ? null : (
          <p className="text-sm text-destructive" id="password-error">
            {passwordError}
          </p>
        )}
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/signup"
        >
          Crear una cuenta
        </Link>
      </p>
    </form>
  );
}
