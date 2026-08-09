export interface ApiEnv {
  readonly nodeEnv: string;
  readonly port: number;
  readonly databaseUrl: string | undefined;
  readonly eaClubsBaseUrl: string;
  readonly internalJobSecret: string;
  readonly initialSuperuserActorId: string | undefined;
}

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
    initialSuperuserActorId: source.INITIAL_SUPERUSER_ACTOR_ID || undefined,
  };
}
