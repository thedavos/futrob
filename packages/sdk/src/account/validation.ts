import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordChangeProblem = "current-missing" | "too-short" | "too-long" | "mismatch";

export function passwordChangeProblem(input: {
  readonly current: string;
  readonly next: string;
  readonly confirm: string;
}): PasswordChangeProblem | null {
  if (!input.current) return "current-missing";
  if (input.next.length < PASSWORD_MIN_LENGTH) return "too-short";
  if (input.next.length > PASSWORD_MAX_LENGTH) return "too-long";
  if (input.next !== input.confirm) return "mismatch";
  return null;
}

export type EmailChangeProblem = "invalid" | "unchanged";

const emailSchema = z.email();

export function emailChangeProblem(input: {
  readonly currentEmail: string;
  readonly newEmail: string;
}): EmailChangeProblem | null {
  const next = input.newEmail.trim().toLowerCase();
  if (!emailSchema.safeParse(next).success) return "invalid";
  if (next === input.currentEmail.trim().toLowerCase()) return "unchanged";
  return null;
}
