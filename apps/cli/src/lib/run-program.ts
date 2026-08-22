import { Cause, Effect, Exit } from "effect";
import type { CliError } from "./errors.ts";
import { printError } from "./print.ts";

function describe(error: CliError): string[] {
  switch (error._tag) {
    case "UsageError": {
      const lines = [error.message];
      if (error.usage) lines.push(error.usage);
      return lines;
    }
    case "ApiError": {
      const lines = [`API ${error.status}: ${error.code} (${error.messageKey})`];
      if (error.details !== undefined) {
        lines.push(JSON.stringify(error.details));
      }
      return lines;
    }
    case "NetworkError":
      return [`Request failed: ${error.message}`, `Is npm run dev running? Tried ${error.baseUrl}`];
  }
}

/** Runs a command program to completion, printing typed failures and mapping to an exit code. */
export async function runProgram(program: Effect.Effect<number, CliError>): Promise<number> {
  const exit = await Effect.runPromiseExit(program);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  const failure = Cause.failureOption(exit.cause);
  if (failure._tag === "Some") {
    for (const line of describe(failure.value)) {
      printError(line);
    }
  } else {
    printError("Unexpected CLI failure (defect).");
    console.error(exit.cause);
  }
  return 1;
}
