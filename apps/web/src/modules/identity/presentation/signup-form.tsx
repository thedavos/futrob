"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@futrob/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import {
  AUTH_ERROR_GENERIC,
  AUTH_ERROR_NETWORK,
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_PASSWORD_MIN,
  AUTH_VALIDATION_REQUIRED,
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  isNetworkError,
  readString,
  type AuthClientError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type {
  AuthFormField,
  AuthFormState,
} from "@/modules/identity/presentation/auth-form-state.ts";
import { organizationsBrowserClient } from "@/modules/organizations/presentation/organizations-browser-client.ts";

interface SignupValues {
  name: string;
  email: string;
  password: string;
}

function validateSignup(values: SignupValues): Partial<Record<AuthFormField, string>> {
  const fieldErrors: Partial<Record<AuthFormField, string>> = {};

  if (values.name.length === 0) {
    fieldErrors.name = AUTH_VALIDATION_REQUIRED;
  }

  if (values.email.length === 0) {
    fieldErrors.email = AUTH_VALIDATION_REQUIRED;
  } else if (!EMAIL_PATTERN.test(values.email)) {
    fieldErrors.email = AUTH_VALIDATION_EMAIL;
  }

  if (values.password.length === 0) {
    fieldErrors.password = AUTH_VALIDATION_REQUIRED;
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = AUTH_VALIDATION_PASSWORD_MIN;
  }

  return fieldErrors;
}

function signupErrorState(error: AuthClientError): AuthFormState {
  if (error.status === 0) {
    return { status: "error", message: AUTH_ERROR_NETWORK };
  }

  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        status: "error",
        message: "Ya existe una cuenta con este correo.",
        fieldErrors: { email: "Ya existe una cuenta con este correo." },
      };
    case "INVALID_EMAIL":
      return {
        status: "error",
        message: AUTH_VALIDATION_EMAIL,
        fieldErrors: { email: AUTH_VALIDATION_EMAIL },
      };
    case "PASSWORD_TOO_SHORT":
      return {
        status: "error",
        message: AUTH_VALIDATION_PASSWORD_MIN,
        fieldErrors: { password: AUTH_VALIDATION_PASSWORD_MIN },
      };
    default:
      return { status: "error", message: AUTH_ERROR_GENERIC };
  }
}

export function SignupForm() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthFormState>({ status: "idle" });

  const nameError = state.status === "error" ? state.fieldErrors?.name : undefined;
  const emailError = state.status === "error" ? state.fieldErrors?.email : undefined;
  const passwordError = state.status === "error" ? state.fieldErrors?.password : undefined;
  const isSubmitting = state.status === "submitting" || state.status === "success";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const values: SignupValues = {
      name: readString(formData, "name").trim(),
      email: readString(formData, "email").trim(),
      password: readString(formData, "password"),
    };
    const fieldErrors = validateSignup(values);
    const firstFieldError = fieldErrors.name ?? fieldErrors.email ?? fieldErrors.password;

    if (firstFieldError != null) {
      setState({ status: "error", message: firstFieldError, fieldErrors });
      return;
    }

    setState({ status: "submitting" });

    try {
      const result = await authClient.signUp.email(values);

      if (result.error != null) {
        setState(signupErrorState(result.error));
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
      {state.status === "error" ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          aria-describedby={nameError == null ? undefined : "name-error"}
          aria-invalid={nameError != null}
          autoComplete="name"
          disabled={isSubmitting}
          id="name"
          name="name"
        />
        {nameError == null ? null : (
          <p className="text-sm text-destructive" id="name-error">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          aria-describedby={emailError == null ? undefined : "email-error"}
          aria-invalid={emailError != null}
          autoComplete="email"
          disabled={isSubmitting}
          id="email"
          name="email"
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
        <Input
          aria-describedby={passwordError == null ? undefined : "password-error"}
          aria-invalid={passwordError != null}
          autoComplete="new-password"
          disabled={isSubmitting}
          id="password"
          minLength={MIN_PASSWORD_LENGTH}
          name="password"
          type="password"
        />
        {passwordError == null ? null : (
          <p className="text-sm text-destructive" id="password-error">
            {passwordError}
          </p>
        )}
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit" variant="default">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/login"
        >
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
