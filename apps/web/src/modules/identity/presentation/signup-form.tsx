"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  colors,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldValidity,
  Form,
  InputWithIcon,
  readFormString,
  type FormErrors,
} from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import {
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  EnvelopeSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useAuthResume } from "@/modules/identity/presentation/auth-resume.tsx";
import {
  AUTH_ERROR_GENERIC,
  AUTH_ERROR_NETWORK,
  AUTH_PASSWORD_HINT,
  AUTH_VALIDATION_EMAIL,
  AUTH_VALIDATION_PASSWORD_LENGTH,
  isNetworkError,
  type AuthClientError,
} from "@/modules/identity/presentation/auth-form-helpers.ts";
import type {
  AuthFormField,
  AuthFormState,
} from "@/modules/identity/presentation/auth-form-state.ts";
import {
  validateSignupField,
  type SignupValues,
} from "@/modules/identity/presentation/signup-form-validation.ts";
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
  toggle: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    color: {
      default: colors.mutedForeground,
      ":hover": colors.foreground,
    },
  },
  iconSwap: {
    position: "relative",
    width: "1rem",
    height: "1rem",
  },
  swapIcon: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "1rem",
    height: "1rem",
    transitionProperty: "opacity, filter, scale",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-standard)",
  },
  swapHidden: {
    scale: "0.25",
    opacity: 0,
    filter: "blur(4px)",
  },
  swapVisible: {
    scale: 1,
    opacity: 1,
    filter: "blur(0)",
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
    fontSize: "0.75rem",
    lineHeight: "1rem",
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

interface SignupFailure {
  fieldErrors?: FormErrors<AuthFormField>;
  message?: string;
}

function signupFailure(error: AuthClientError): SignupFailure {
  if (error.status === 0) {
    return { message: AUTH_ERROR_NETWORK };
  }

  switch (error.code) {
    case undefined:
      return { message: AUTH_ERROR_GENERIC };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        fieldErrors: { email: "Ya existe una cuenta con este correo." },
      };
    case "INVALID_EMAIL":
      return {
        fieldErrors: { email: AUTH_VALIDATION_EMAIL },
      };
    case "PASSWORD_TOO_SHORT":
      return {
        fieldErrors: { password: AUTH_VALIDATION_PASSWORD_LENGTH },
      };
    default:
      return { message: AUTH_ERROR_GENERIC };
  }
}

export function SignupForm() {
  const { redirectTo, afterAuthenticated } = useAuthResume();
  const [state, setState] = useState<AuthFormState>({ status: "idle" });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const validation = useFormValidation<AuthFormField>();

  const isSubmitting = state.status === "submitting" || state.status === "success";
  const form = applyStyles(styles.form);
  const toggle = applyStyles(styles.toggle);
  const eye = applyStyles(styles.swapIcon, isPasswordVisible ? styles.swapHidden : styles.swapVisible);
  const eyeSlash = applyStyles(
    styles.swapIcon,
    isPasswordVisible ? styles.swapVisible : styles.swapHidden,
  );
  const submit = applyStyles(styles.submit);
  const link = applyStyles(styles.link);

  async function handleSubmit(formValues: SignupValues) {
    const values: SignupValues = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      password: formValues.password,
    };

    validation.clearServerErrors();
    setState({ status: "submitting" });

    try {
      const result = await authClient.signUp.email(values);

      if (result.error !== null) {
        const failure = signupFailure(result.error);
        if (failure.fieldErrors !== undefined) {
          validation.applyServerErrors(failure.fieldErrors);
        }
        setState(
          failure.message === undefined
            ? { status: "error" }
            : { status: "error", message: failure.message },
        );
        return;
      }

      setState({ status: "success" });
      await afterAuthenticated("signup");
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error && isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  return (
    <Form<SignupValues>
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
          {...validation.getFieldValidationProps("name")}
          disabled={isSubmitting}
          name="name"
          validate={(value) => validateSignupField("name", readFormString(value))}
        >
          <FieldLabel htmlFor="name">Nombre completo</FieldLabel>
          <InputWithIcon
            autoComplete="name"
            disabled={isSubmitting}
            id="name"
            name="name"
            placeholder="Ingresa tu nombre completo"
            startIcon={UserIcon}
          />
          <FieldError />
        </Field>

        <Field
          {...validation.getFieldValidationProps("email")}
          disabled={isSubmitting}
          name="email"
          validate={(value) => validateSignupField("email", readFormString(value))}
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
          validate={(value) => validateSignupField("password", readFormString(value))}
        >
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <InputWithIcon
            autoComplete="new-password"
            disabled={isSubmitting}
            endAction={
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
                <span aria-hidden="true" {...applyStyles(styles.iconSwap)}>
                  <EyeIcon className={eye.className} style={eye.style} />
                  <EyeSlashIcon className={eyeSlash.className} style={eyeSlash.style} />
                </span>
              </Button>
            }
            id="password"
            name="password"
            placeholder="Crea una contraseña"
            startIcon={LockIcon}
            type={isPasswordVisible ? "text" : "password"}
          />
          <FieldValidity>
            {({ validity }) =>
              validity.valid === false ? null : (
                <FieldDescription>{AUTH_PASSWORD_HINT}</FieldDescription>
              )
            }
          </FieldValidity>
          <FieldError />
        </Field>
      </div>

      <div {...applyStyles(styles.actions)}>
        <Button
          className={submit.className}
          disabled={isSubmitting}
          style={submit.style}
          type="submit"
          variant="default"
        >
          Crear cuenta
        </Button>

        <p {...applyStyles(styles.footer)}>
          ¿Ya tienes una cuenta?{" "}
          <Link className={link.className} search={{ redirectTo }} style={link.style} to="/login">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </Form>
  );
}
