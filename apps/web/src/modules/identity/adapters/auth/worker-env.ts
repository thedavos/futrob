import { env } from "cloudflare:workers";

export type WorkerBindings = typeof env;

/** Reads Worker bindings. Prefer secrets via Wrangler; process.env is a local fallback. */
export function getWorkerEnv(): WorkerBindings {
  return env;
}
