"use client";

import { useState } from "react";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  InputWithIcon,
  readFormString,
} from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import { useAuthResume } from "@/modules/identity/presentation/auth-resume.tsx";
import {
  AUTH_ERROR_GENERIC,
  AUTH_ERROR_NETWORK,
  isNetworkError,
  type AuthClientError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type { AuthFormState } from "@/modules/identity/presentation/auth-form-state.ts";
import {
  validateLoginField,
  type LoginField,
  type LoginValues,
} from "@/modules/identity/presentation/login-form-validation.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

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
  const { redirectTo, afterAuthenticated } = useAuthResume();
  const [state, setState] = useState<AuthFormState>({ status: "idle" });
  const validation = useFormValidation<LoginField>();

  const isSubmitting = state.status === "submitting" || state.status === "success";

  async function handleSubmit(formValues: LoginValues) {
    const values: LoginValues = {
      email: formValues.email.trim(),
      password: formValues.password,
    };

    validation.clearServerErrors();
    setState({ status: "submitting" });

    try {
      const result = await authClient.signIn.email(values);

      if (result.error !== null) {
        setState({ status: "error", message: loginErrorMessage(result.error) });
        return;
      }

      setState({ status: "success" });
      await afterAuthenticated("login");
    } catch (error) {
      setState({
        status: "error",
        message: isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  return (
    <Form<LoginValues>
      aria-busy={isSubmitting}
      className="space-y-6"
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
    >
      {state.status === "error" && state.message !== undefined ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <Field
        {...validation.getFieldValidationProps("email")}
        disabled={isSubmitting}
        name="email"
        validate={(value) => validateLoginField("email", readFormString(value))}
      >
        <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
        <InputWithIcon
          autoComplete="email"
          disabled={isSubmitting}
          id="email"
          name="email"
          placeholder="ejemplo@correo.com"
          startIcon={Mail}
          type="email"
        />
        <FieldError />
      </Field>

      <Field
        {...validation.getFieldValidationProps("password")}
        disabled={isSubmitting}
        name="password"
        validate={(value) => validateLoginField("password", readFormString(value))}
      >
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <InputWithIcon
          autoComplete="current-password"
          disabled={isSubmitting}
          id="password"
          name="password"
          placeholder="Ingresa tu contraseña"
          startIcon={Lock}
          type="password"
        />
        <FieldError />
      </Field>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          search={{ redirectTo }}
          to="/signup"
        >
          Crear una cuenta
        </Link>
      </p>
    </Form>
  );
}
