/**
 * Ambient module for the Cloudflare Vite virtual binding import.
 */

declare module "cloudflare:workers" {
  export const env: {
    MEDIA_BUCKET?: import("./shared/infrastructure/media/media-storage.ts").MediaBucket;
    JOB_QUEUE?: import("./workers/provider-sync-job.producer.ts").ProviderSyncJobQueue;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_TRUSTED_ORIGINS?: string;
    APP_BASE_URL?: string;
    FUTROB_API_BASE_URL?: string;
    /** apps/auth origin, such as `https://auth.futrob.app`. */
    FUTROB_AUTH_BASE_URL?: string;
    /** Shared with apps/auth; lets it trust the client IP web forwards. */
    AUTH_PROXY_SECRET?: string;
    INTERNAL_JOB_SECRET?: string;
    ENVIRONMENT?: string;
  };
}
