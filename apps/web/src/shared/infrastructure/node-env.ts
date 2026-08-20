import { z } from "zod";

const nodeEnvSchema = z.record(z.string(), z.string().optional());

export function hasNodeProcessEnv(): boolean {
  return "process" in globalThis && globalThis.process !== undefined;
}

export function readNodeEnv(key: string): string | undefined {
  if (!hasNodeProcessEnv()) return undefined;
  const parsed = nodeEnvSchema.safeParse(globalThis.process.env);
  return parsed.success ? parsed.data[key] : undefined;
}
