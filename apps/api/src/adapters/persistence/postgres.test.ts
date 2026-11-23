import { describe, expect, it } from "vite-plus/test";
import { createPostgresPool, createRateLimitPostgresPool } from "./postgres.ts";

// pg opens no connection until a query, so these pools never reach a server.
const DATABASE_URL = "postgres://futrob:unused@127.0.0.1:1/futrob";

describe("Postgres pools", () => {
  it.each([
    [
      "product",
      (onIdleError: (error: Error) => void) => createPostgresPool(DATABASE_URL, onIdleError),
    ],
    [
      "rate limit",
      (onIdleError: (error: Error) => void) =>
        createRateLimitPostgresPool({ databaseUrl: DATABASE_URL, onIdleError }),
    ],
  ])(
    "hands an idle connection error on the %s pool to the handler instead of crashing",
    async (_name, create) => {
      const received: Error[] = [];
      const pool = create((error) => received.push(error));
      const lost = new Error("terminating connection due to administrator command");

      pool?.emit("error", lost);

      expect(received).toEqual([lost]);
      await pool?.end();
    },
  );

  it("returns no pool without DATABASE_URL", () => {
    expect(createPostgresPool(undefined, () => undefined)).toBeUndefined();
    expect(
      createRateLimitPostgresPool({ databaseUrl: undefined, onIdleError: () => undefined }),
    ).toBeUndefined();
  });
});
