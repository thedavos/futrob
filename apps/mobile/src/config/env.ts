/**
 * Mobile app configuration. Values come from Expo env (EXPO_PUBLIC_*),
 * mirroring apps/web/.dev.vars conventions.
 */
const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_FUTROB_API_BASE_URL;
const RAW_AUTH_BASE_URL = process.env.EXPO_PUBLIC_FUTROB_AUTH_BASE_URL;

export const API_BASE_URL: string = (RAW_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/**
 * Better Auth origin (`apps/auth` worker).
 * Falls back to the web origin (`API_BASE_URL`) so the same-origin proxy can
 * forward `/api/auth` when `EXPO_PUBLIC_FUTROB_AUTH_BASE_URL` is unset.
 */
const AUTH_ORIGIN: string = (RAW_AUTH_BASE_URL?.trim() || API_BASE_URL).replace(/\/$/, "");

export const AUTH_BASE_URL = `${AUTH_ORIGIN}/api/auth`;
