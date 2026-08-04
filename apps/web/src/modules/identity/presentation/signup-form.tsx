"use client";

import { useState } from "react";
import {
  Button,
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
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
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

interface SignupFailure {
  fieldErrors?: FormErrors<AuthFormField>;
  message?: string;
}

function signupFailure(error: AuthClientError): SignupFailure {
  if (error.status === 0) {
    return { message: AUTH_ERROR_NETWORK };
  }

  switch (error.code) {
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
  const navigate = useNavigate();
  const [state, setState] = useState<AuthFormState>({ status: "idle" });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const validation = useFormValidation<AuthFormField>();

  const isSubmitting = state.status === "submitting" || state.status === "success";

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
      await navigate({ to: "/onboarding" });
    } catch (error) {
      setState({
        status: "error",
        message: isNetworkError(error) ? AUTH_ERROR_NETWORK : AUTH_ERROR_GENERIC,
      });
    }
  }

  return (
    <Form<SignupValues>
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
          startIcon={UserRound}
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
          startIcon={Mail}
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
              className="rounded-l-none text-muted-foreground hover:text-foreground"
              disabled={isSubmitting}
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
              size="icon"
              static
              type="button"
              variant="ghost"
            >
              <span className="relative size-4" aria-hidden="true">
                <Eye
                  className={`absolute inset-0 size-4 transition-[opacity,filter,scale] duration-(--duration-slow) ease-(--ease-standard) ${
                    isPasswordVisible
                      ? "scale-[0.25] opacity-0 blur-[4px]"
                      : "scale-100 opacity-100 blur-0"
                  }`}
                />
                <EyeOff
                  className={`absolute inset-0 size-4 transition-[opacity,filter,scale] duration-(--duration-slow) ease-(--ease-standard) ${
                    isPasswordVisible
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-[0.25] opacity-0 blur-[4px]"
                  }`}
                />
              </span>
            </Button>
          }
          id="password"
          name="password"
          placeholder="Crea una contraseña"
          startIcon={Lock}
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

      <Button className="w-full" disabled={isSubmitting} type="submit" variant="default">
        Crear cuenta
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya tienes una cuenta?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/login"
        >
          Iniciar sesión
        </Link>
      </p>
    </Form>
  );
}
