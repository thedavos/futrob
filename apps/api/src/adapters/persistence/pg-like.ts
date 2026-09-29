/** Escapes literal text for a parameterized PostgreSQL LIKE/ILIKE pattern using backslash. */
export function escapeLike(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}
