import type { Pool, PoolClient } from "pg";
import { z } from "zod";

const queryTextSchema = z.union([
  z.string(),
  z.object({ text: z.string() }).transform((query) => query.text),
]);

export type FakePgQueryResult = Readonly<{
  rows: readonly object[];
  rowCount?: number;
}>;

export type FakePgQueryable = {
  query: (sql: string, values?: readonly unknown[]) => Promise<FakePgQueryResult>;
  release?: () => void;
};

export type FakePgClient = FakePgQueryable & {
  readonly queries: string[];
};

export type FakePgPool = FakePgQueryable & {
  connect?: () => Promise<FakePgQueryable>;
};

export function createFakePgClient(
  queryImpl: (
    sql: string,
    values?: readonly unknown[],
  ) => Promise<FakePgQueryResult> = async () => ({ rows: [] }),
): FakePgClient {
  const queries: string[] = [];
  return {
    queries,
    query: async (sql, values) => {
      const parsedText = queryTextSchema.safeParse(sql);
      if (parsedText.success) {
        queries.push(parsedText.data);
      }
      return queryImpl(sql, values);
    },
    release: () => undefined,
  };
}

export function createFakePgPool(client: FakePgClient): FakePgPool {
  return {
    connect: async () => client,
    query: client.query,
  };
}

/** Wraps a fake pool for repositories that expect `pg.Pool` at the type level. */
export function asPgPool(fake: FakePgPool): Pool {
  // SAFETY: Test double implements only query/connect used by repositories under test.
  return fake as Pool;
}

/** Wraps a fake client for repositories that expect `pg.PoolClient` at the type level. */
export function asPgClient(fake: FakePgQueryable): PoolClient {
  // SAFETY: Test double implements only query/release used by repositories under test.
  return fake as PoolClient;
}
