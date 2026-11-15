export interface ApiEnv {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string | undefined;
  readonly eaClubsBaseUrl: string;
  readonly internalJobSecret: string;
  readonly resultsSystemActorId: string | undefined;
  readonly schedulingSystemActorId: string | undefined;
  readonly initialSuperuserActorId: string | undefined;
  /** Resend API key (ADR-0031); without it email stays in memory or pending. */
  readonly resendApiKey: string | undefined;
  /** Sender on the verified domain, such as `Futrob <avisos@futrob.app>`. */
  readonly emailFrom: string | undefined;
  /** Web origin of email links. */
  readonly webBaseUrl: string;
}

const DEFAULT_WEB_BASE_URL = "http://localhost:3000";

const DEFAULT_PORT = 8787;
const DEFAULT_EA_CLUBS_BASE_URL = "https://proclubs.ea.com/api/fc";

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const port = Number.parseInt(source.PORT ?? "", 10);

  return {
    nodeEnv: source.NODE_ENV ?? "development",
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
    databaseUrl: source.DATABASE_URL || undefined,
    eaClubsBaseUrl: source.EA_CLUBS_BASE_URL || DEFAULT_EA_CLUBS_BASE_URL,
    internalJobSecret: source.INTERNAL_JOB_SECRET ?? "",
    resultsSystemActorId: source.RESULTS_SYSTEM_ACTOR_ID || undefined,
    schedulingSystemActorId: source.SCHEDULING_SYSTEM_ACTOR_ID || undefined,
    initialSuperuserActorId: source.INITIAL_SUPERUSER_ACTOR_ID || undefined,
    resendApiKey: source.RESEND_API_KEY || undefined,
    emailFrom: source.EMAIL_FROM || undefined,
    webBaseUrl: source.WEB_BASE_URL || DEFAULT_WEB_BASE_URL,
  };
}
