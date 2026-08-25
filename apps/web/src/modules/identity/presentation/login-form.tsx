"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  InputWithIcon,
  readFormString,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";
import { LockIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
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

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  error: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--destructive) 40%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
    paddingInline: "0.75rem",
    paddingBlock: "0.625rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.destructive,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  submit: {
    width: "100%",
  },
  footer: {
    textAlign: "center",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  link: {
    fontWeight: 500,
    color: colors.foreground,
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
});

function loginErrorMessage(error: AuthClientError): string {
  if (error.status === 0) {
    return AUTH_ERROR_NETWORK;
  }

  switch (error.code) {
    case undefined:
      return AUTH_ERROR_GENERIC;
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
  const form = applyStyles(styles.form);
  const submit = applyStyles(styles.submit);
  const link = applyStyles(styles.link);

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
        message:
          error instanceof Error && isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  return (
    <Form<LoginValues>
      aria-busy={isSubmitting}
      className={form.className}
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
      style={form.style}
    >
      <div {...applyStyles(styles.fields)}>
        {state.status === "error" && state.message !== undefined ? (
          <div role="alert" {...applyStyles(styles.error)}>
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
            startIcon={EnvelopeSimpleIcon}
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
            startIcon={LockIcon}
            type="password"
          />
          <FieldError />
        </Field>
      </div>

      <div {...applyStyles(styles.actions)}>
        <Button
          className={submit.className}
          disabled={isSubmitting}
          style={submit.style}
          type="submit"
        >
          Iniciar sesión
        </Button>

        <p {...applyStyles(styles.footer)}>
          ¿Aún no tienes cuenta?{" "}
          <Link className={link.className} search={{ redirectTo }} style={link.style} to="/signup">
            Crear una cuenta
          </Link>
        </p>
      </div>
    </Form>
  );
}
