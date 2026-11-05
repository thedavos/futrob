import pg, { type Pool } from "pg";
import { DEMO_EMAIL_DOMAIN } from "./accounts.ts";
import { DEMO_EA_ID_PREFIX } from "./fake-ea.ts";

/** A delete another row still depends on, or an append-only audit row (cascade only). */
const RETRY_LATER = new Set(["23503", "23001"]);
const MAX_PASSES = 10;

interface DemoScope {
  readonly actorIds: readonly string[];
  readonly organizationIds: readonly string[];
}

async function findDemoScope(pool: Pool): Promise<DemoScope> {
  const actors = await pool.query<{ id: string }>(
    `SELECT subject.actor_id AS id
     FROM auth_users AS users
     JOIN identity_subjects AS subject
       ON subject.provider = 'credential' AND subject.subject = users.id
     WHERE users.email LIKE $1
     UNION
     SELECT id FROM actors WHERE id LIKE 'demo-system-%'`,
    [`%@${DEMO_EMAIL_DOMAIN}`],
  );
  const actorIds = actors.rows.map((row) => row.id);
  const organizations = await pool.query<{ id: string }>(
    "SELECT id FROM organizations WHERE created_by_actor_id = ANY($1::text[])",
    [actorIds],
  );
  return { actorIds, organizationIds: organizations.rows.map((row) => row.id) };
}

/**
 * Deletes everything the demo seed created and nothing else: rows of demo organizations,
 * rows that reference demo actors, demo provider data, then the accounts themselves.
 *
 * Tables are read from the catalog so new migrations are covered without edits. Some
 * foreign keys are RESTRICT and audit tables only accept cascaded deletes, so statements
 * run in passes until nothing is left to delete.
 */
export async function resetDemoData(
  pool: Pool,
): Promise<{ actors: number; organizations: number }> {
  const scope = await findDemoScope(pool);
  const orgTables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'organization_id'
       AND table_name <> 'organizations'`,
  );
  const actorColumns = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT source.relname AS table_name, attribute.attname AS column_name
     FROM pg_constraint AS fk
     JOIN pg_class AS source ON source.oid = fk.conrelid
     JOIN pg_attribute AS attribute
       ON attribute.attrelid = fk.conrelid AND attribute.attnum = ANY (fk.conkey)
     WHERE fk.contype = 'f' AND fk.confrelid = 'actors'::regclass
       AND source.relnamespace = 'public'::regnamespace`,
  );

  const statements: Array<{ sql: string; values: unknown[] }> = [];
  for (const { table_name } of orgTables.rows) {
    statements.push({
      sql: `DELETE FROM "${table_name}" WHERE organization_id = ANY($1::text[])`,
      values: [scope.organizationIds],
    });
  }
  for (const { table_name, column_name } of actorColumns.rows) {
    statements.push({
      sql: `DELETE FROM "${table_name}" WHERE "${column_name}" = ANY($1::text[])`,
      values: [scope.actorIds],
    });
  }
  const providerPrefix = `${DEMO_EA_ID_PREFIX}%`;
  statements.push(
    {
      sql: "DELETE FROM provider_matches WHERE external_match_id LIKE $1",
      values: [providerPrefix],
    },
    {
      sql: "DELETE FROM raw_provider_observations WHERE external_resource_id LIKE $1",
      values: [providerPrefix],
    },
    {
      sql: "DELETE FROM provider_response_cache WHERE cache_key LIKE $1",
      values: [`%${DEMO_EA_ID_PREFIX}%`],
    },
    {
      sql: "DELETE FROM organizations WHERE id = ANY($1::text[])",
      values: [scope.organizationIds],
    },
    { sql: "DELETE FROM auth_users WHERE email LIKE $1", values: [`%@${DEMO_EMAIL_DOMAIN}`] },
    { sql: "DELETE FROM actors WHERE id = ANY($1::text[])", values: [scope.actorIds] },
  );

  let blocked: string[] = [];
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    blocked = [];
    for (const statement of statements) {
      try {
        await pool.query(statement.sql, statement.values);
      } catch (error) {
        if (!(error instanceof pg.DatabaseError) || !RETRY_LATER.has(error.code ?? "")) throw error;
        blocked.push(statement.sql);
      }
    }
    if (blocked.length === 0) break;
  }
  if (blocked.length > 0) {
    throw new Error(`Reset could not delete demo rows:\n${blocked.join("\n")}`);
  }
  return { actors: scope.actorIds.length, organizations: scope.organizationIds.length };
}

export async function demoDataExists(pool: Pool): Promise<boolean> {
  const result = await pool.query("SELECT 1 FROM auth_users WHERE email LIKE $1 LIMIT 1", [
    `%@${DEMO_EMAIL_DOMAIN}`,
  ]);
  return result.rows.length > 0;
}
