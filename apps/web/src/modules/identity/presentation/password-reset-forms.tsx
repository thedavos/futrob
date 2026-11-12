"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Form,
  InputWithIcon,
  readFormString,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
import {
  AUTH_ERROR_GENERIC,
  AUTH_ERROR_NETWORK,
  AUTH_PASSWORD_HINT,
  isNetworkError,
  type AuthClientError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type { AuthFormState } from "@/modules/identity/presentation/auth-form-state.ts";
import { validateLoginField } from "@/modules/identity/presentation/login-form-validation.ts";
import {
  validatePasswordConfirmation,
  validateSignupField,
} from "@/modules/identity/presentation/signup-form-validation.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

/** Where the auth worker sends a checked reset link (see apps/auth `PASSWORD_RESET_WEB_CALLBACK`). */
export const PASSWORD_RESET_PATH = "/reset-password";

const styles = stylex.create({
  form: { display: "flex", flexDirection: "column", gap: "2rem" },
  fields: { display: "flex", flexDirection: "column", gap: "1rem" },
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
  toggle: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    color: { default: colors.mutedForeground, ":hover": colors.foreground },
  },
  icon: { width: "1.25rem", height: "1.25rem" },
  actions: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  submit: { width: "100%" },
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
    textDecorationLine: { default: "none", ":hover": "underline" },
  },
});

function requestFailureMessage(error: AuthClientError): string {
  if (error.status === 0) return AUTH_ERROR_NETWORK;
  if (error.status === 429) return "Demasiados intentos. Espera un minuto e intenta de nuevo.";
  return AUTH_ERROR_GENERIC;
}

function BackToLogin({ label = "Volver a iniciar sesión" }: { label?: string }) {
  const link = applyStyles(styles.link);
  return (
    <p {...applyStyles(styles.footer)}>
      <Link className={link.className} style={link.style} to="/login">
        {label}
      </Link>
    </p>
  );
}

/**
 * Asks for a reset link. The confirmation is the same whether or not the account exists,
 * so this page never tells who has a Futrob account.
 */
export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthFormState>({ status: "idle" });
  const validation = useFormValidation<"email">();
  const isSubmitting = state.status === "submitting";
  const form = applyStyles(styles.form);
  const submit = applyStyles(styles.submit);

  async function handleSubmit(values: { email: string }) {
    setState({ status: "submitting" });
    try {
      const result = await authClient.requestPasswordReset({
        email: values.email.trim(),
        redirectTo: PASSWORD_RESET_PATH,
      });
      setState(
        result.error === null
          ? { status: "success" }
          : { status: "error", message: requestFailureMessage(result.error) },
      );
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error && isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  if (state.status === "success") {
    return (
      <div {...applyStyles(styles.form)}>
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
          <AlertTitle>Revisa tu correo</AlertTitle>
          <AlertDescription>
            Si hay una cuenta con ese correo, te enviamos un enlace para elegir una contraseña
            nueva. Vence en 1 hora y solo funciona una vez.
          </AlertDescription>
        </Alert>
        <BackToLogin />
      </div>
    );
  }

  return (
    <Form<{ email: string }>
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
      </div>
      <div {...applyStyles(styles.actions)}>
        <Button
          className={submit.className}
          disabled={isSubmitting}
          style={submit.style}
          type="submit"
        >
          Enviar enlace
        </Button>
        <BackToLogin />
      </div>
    </Form>
  );
}

function InvalidResetLink() {
  const link = applyStyles(styles.link);
  return (
    <div {...applyStyles(styles.form)}>
      <Alert variant="destructive">
        <WarningCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
        <AlertTitle>Este enlace ya no sirve</AlertTitle>
        <AlertDescription>
          Ya se usó o venció. Pide otro y usa el más reciente que te llegue.
        </AlertDescription>
      </Alert>
      <Link className={link.className} style={link.style} to="/forgot-password">
        Pedir otro enlace
      </Link>
    </div>
  );
}

type ResetState = AuthFormState | { status: "invalid-link" };

interface ResetValues {
  password: string;
  confirmPassword: string;
}

/**
 * Sets the new password with the token the reset link carried. A used or expired token, or
 * a link the auth worker already rejected (`invalid`), offers to ask for another.
 */
export function ResetPasswordForm({
  token,
  invalid = false,
}: Readonly<{ token: string | undefined; invalid?: boolean }>) {
  const [state, setState] = useState<ResetState>(
    invalid || token === undefined ? { status: "invalid-link" } : { status: "idle" },
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const validation = useFormValidation<"password" | "confirmPassword">();
  const isSubmitting = state.status === "submitting";
  const form = applyStyles(styles.form);
  const toggle = applyStyles(styles.toggle);
  const submit = applyStyles(styles.submit);

  if (state.status === "invalid-link" || token === undefined) {
    return <InvalidResetLink />;
  }

  if (state.status === "success") {
    return (
      <div {...applyStyles(styles.form)}>
        <Alert variant="success">
          <CheckCircleIcon aria-hidden="true" {...applyStyles(styles.icon)} />
          <AlertTitle>Contraseña actualizada</AlertTitle>
          <AlertDescription>
            Cerramos todas tus sesiones. Inicia sesión con tu contraseña nueva.
          </AlertDescription>
        </Alert>
        <BackToLogin label="Iniciar sesión" />
      </div>
    );
  }

  async function handleSubmit(values: ResetValues) {
    setState({ status: "submitting" });
    try {
      const result = await authClient.resetPassword({ newPassword: values.password, token });
      if (result.error === null) {
        setState({ status: "success" });
      } else if (result.error.code === "INVALID_TOKEN") {
        setState({ status: "invalid-link" });
      } else {
        setState({ status: "error", message: requestFailureMessage(result.error) });
      }
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error && isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  const visibility = (
    <Button
      aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={isPasswordVisible}
      className={toggle.className}
      disabled={isSubmitting}
      onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
      size="icon"
      static
      style={toggle.style}
      type="button"
      variant="ghost"
    >
      {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
    </Button>
  );

  return (
    <Form<ResetValues>
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
          {...validation.getFieldValidationProps("password")}
          disabled={isSubmitting}
          name="password"
          validate={(value) => validateSignupField("password", readFormString(value))}
        >
          <FieldLabel htmlFor="password">Contraseña nueva</FieldLabel>
          <InputWithIcon
            autoComplete="new-password"
            disabled={isSubmitting}
            endAction={visibility}
            id="password"
            name="password"
            placeholder="Crea una contraseña"
            startIcon={LockIcon}
            type={isPasswordVisible ? "text" : "password"}
          />
          <FieldDescription>{AUTH_PASSWORD_HINT}</FieldDescription>
          <FieldError />
        </Field>
        <Field
          {...validation.getFieldValidationProps("confirmPassword")}
          disabled={isSubmitting}
          name="confirmPassword"
          validate={(value, values) =>
            validatePasswordConfirmation(readFormString(value), readFormString(values.password))
          }
        >
          <FieldLabel htmlFor="confirmPassword">Repetir contraseña</FieldLabel>
          <InputWithIcon
            autoComplete="new-password"
            disabled={isSubmitting}
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Repite tu contraseña"
            startIcon={LockIcon}
            type={isPasswordVisible ? "text" : "password"}
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
          Guardar contraseña
        </Button>
        <BackToLogin />
      </div>
    </Form>
  );
}
