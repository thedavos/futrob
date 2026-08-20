import type { WorkerBindings } from "../adapters/auth/worker-env.ts";

/** Lazy Worker bindings access for routes and shared infra outside the identity adapters layer. */
export async function getWorkerBindings(): Promise<WorkerBindings> {
  const { getWorkerEnv } = await import("../adapters/auth/worker-env.ts");
  return getWorkerEnv();
}
