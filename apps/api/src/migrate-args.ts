import { MigrationBaselineInvalidError } from "@/adapters/persistence/migration-runner.ts";

const DECIMAL_INTEGER = /^[0-9]+$/;

/** Reads `--baseline <N>` / `--baseline=<N>`. The whole argument must be digits. */
export function parseBaseline(argv: readonly string[]): number | undefined {
  const index = argv.findIndex((arg) => arg === "--baseline" || arg.startsWith("--baseline="));
  if (index === -1) return undefined;
  const arg = argv[index] ?? "";
  const raw = arg.startsWith("--baseline=") ? arg.slice("--baseline=".length) : argv[index + 1];
  if (raw === undefined || !DECIMAL_INTEGER.test(raw)) {
    throw new MigrationBaselineInvalidError({
      code: "migrations.baseline_invalid",
      message: "--baseline must be a whole decimal integer",
    });
  }
  return Number(raw);
}
