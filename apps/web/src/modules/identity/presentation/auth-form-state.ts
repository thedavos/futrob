export type AuthFormField = "name" | "email" | "password";

export type AuthFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "error";
      /** Form-level banner; omit for field-only client validation. */
      message?: string;
      fieldErrors?: Partial<Record<AuthFormField, string>>;
    }
  | { status: "success" };
