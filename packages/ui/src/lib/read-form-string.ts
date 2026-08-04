/**
 * Narrows Base UI `Field.validate` / form values to a string.
 * Non-string values (empty select, missing control) become `""`.
 */
export function readFormString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
