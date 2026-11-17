/**
 * Ambient module for the Cloudflare Vite virtual binding import.
 */

declare module "cloudflare:workers" {
  export const env: {
    HYPERDRIVE: import("./shared/infrastructure/postgres.ts").HyperdriveBinding;
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
    RATE_LIMIT_FINGERPRINT_SECRET?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_WINDOW_SECONDS?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_ACTOR_MAX?: string;
    RATE_LIMIT_EA_CLUB_SEARCH_IP_MAX?: string;
    RATE_LIMIT_INVITATION_ACCEPT_WINDOW_SECONDS?: string;
    RATE_LIMIT_INVITATION_ACCEPT_ACTOR_MAX?: string;
    RATE_LIMIT_INVITATION_ACCEPT_IP_MAX?: string;
    RATE_LIMIT_INVITATION_PREVIEW_WINDOW_SECONDS?: string;
    RATE_LIMIT_INVITATION_PREVIEW_ACTOR_MAX?: string;
    RATE_LIMIT_INVITATION_PREVIEW_IP_MAX?: string;
    RATE_LIMIT_INVITATION_PUBLIC_PREVIEW_WINDOW_SECONDS?: string;
    RATE_LIMIT_INVITATION_PUBLIC_PREVIEW_ACTOR_MAX?: string;
    RATE_LIMIT_INVITATION_PUBLIC_PREVIEW_IP_MAX?: string;
    RATE_LIMIT_PLAYER_SEARCH_WINDOW_SECONDS?: string;
    RATE_LIMIT_PLAYER_SEARCH_ACTOR_MAX?: string;
    RATE_LIMIT_PLAYER_SEARCH_IP_MAX?: string;
  };
}
