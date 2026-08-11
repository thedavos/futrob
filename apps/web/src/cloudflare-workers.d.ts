/**
 * Ambient module for the Cloudflare Vite virtual binding import.
 */

declare module "cloudflare:workers" {
  export const env: {
    APP_DB: import("./shared/infrastructure/d1.ts").AppD1Database;
    MEDIA_BUCKET?: unknown;
    JOB_QUEUE?: import("./workers/provider-sync-job.producer.ts").ProviderSyncJobQueue;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_TRUSTED_ORIGINS?: string;
    APP_BASE_URL?: string;
    ENVIRONMENT?: string;
    RATE_LIMIT_FINGERPRINT_SECRET?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX?: string;
    RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS?: string;
    RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX?: string;
    RATE_LIMIT_INVITATION_ACCEPT_IP_MAX?: string;
  };
}
