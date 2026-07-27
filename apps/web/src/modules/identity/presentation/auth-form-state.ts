export type AuthFormField = "name" | "email" | "password";

export type AuthFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AuthFormField, string>>;
    }
  | { status: "success" };
