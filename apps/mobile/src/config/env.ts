/**
 * Mobile app configuration. Values come from Expo env (EXPO_PUBLIC_*),
 * mirroring apps/web/.dev.vars conventions.
 */
const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_FUTROB_API_BASE_URL;

export const API_BASE_URL: string = (RAW_API_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;
