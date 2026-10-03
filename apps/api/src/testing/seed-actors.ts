interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rowCount: number | null }>;
}

/**
 * Integration fixtures reference actors by id. Since migration 0044 every stored
 * ActorId has a foreign key to `actors`, so fixtures register them first.
 */
export async function seedActors(db: Queryable, ...actorIds: readonly string[]): Promise<void> {
  await db.query(
    `INSERT INTO actors (id, created_at)
     SELECT id, NOW() FROM unnest($1::text[]) AS id
     ON CONFLICT (id) DO NOTHING`,
    [[...actorIds]],
  );
}
