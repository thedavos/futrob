export type AuthFormField = "name" | "email" | "password";

export type AuthFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "error";
      /** Form-level error only; field errors are owned by Base UI Form. */
      message?: string;
    }
  | { status: "success" };
