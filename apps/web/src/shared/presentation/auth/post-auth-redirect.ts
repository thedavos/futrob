const REDIRECT_PREFIX = "/";

export function sanitizePostAuthRedirect(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) return undefined;
  if (!value.startsWith(REDIRECT_PREFIX) || value.startsWith("//")) return undefined;
  return value;
}

export function loginSearchWithRedirect(redirect: string | undefined) {
  const safe = sanitizePostAuthRedirect(redirect);
  return safe ? { redirect: safe } : {};
}
