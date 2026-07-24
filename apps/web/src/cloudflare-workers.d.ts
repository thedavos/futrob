/**
 * Ambient module for the Cloudflare Vite virtual binding import.
 */

declare module "cloudflare:workers" {
  export const env: {
    APP_DB: import("./shared/infrastructure/d1.ts").AppD1Database;
    MEDIA_BUCKET?: unknown;
    JOB_QUEUE?: unknown;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_TRUSTED_ORIGINS?: string;
    APP_BASE_URL?: string;
  };
}
