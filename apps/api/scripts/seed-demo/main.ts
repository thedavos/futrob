/**
 * Seeds demo accounts and data into the local product Postgres.
 *
 *   npm run seed:demo -w @futrob/api             # fails if demo data already exists
 *   npm run seed:demo -w @futrob/api -- --reset  # deletes demo data, then seeds again
 *   npm run seed:demo -w @futrob/api -- --reset-only
 *
 * Every account uses the password `Test123`. See scripts/seed-demo/README.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadDotEnvFile } from "../../src/utils/load-dotenv.ts";
import { DEMO_PASSWORD, createSystemActor, hashPasswordLikeBetterAuth } from "./accounts.ts";
import { createSeedContext, describeError } from "./context.ts";
import { onboardPlayer as onboard, type PlayerRecord } from "./engine.ts";
import { DemoEaWorld } from "./fake-ea.ts";
import { seedLigaAndina } from "./liga-andina.ts";
import { seedAccessStates, seedInvitations, seedPersonalSpace } from "./access.ts";
import { seedBarrioFc, seedClubMulti, seedMegaLiga } from "./orgs.ts";
import { createPeople, type People } from "./people.ts";
import { demoDataExists, resetDemoData } from "./reset.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const DEMO_EA_WORLD_PATH = resolve(here, "../../.demo/ea-world.json");

function assertLocalDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (apps/api/.env). The demo seed needs Postgres.");
  }
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }
  const host = new URL(databaseUrl).hostname;
  if (/railway|rlwy/i.test(host)) {
    throw new Error(`Refusing to seed demo data into ${host}: production runs on Railway.`);
  }
  return databaseUrl;
}

async function main(): Promise<void> {
  loadDotEnvFile(resolve(here, "../../.env"));
  const args = new Set(process.argv.slice(2));
  const databaseUrl = assertLocalDatabase(process.env.DATABASE_URL);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 24 });
  const startedAt = Date.now();
  try {
    if (args.has("--reset") || args.has("--reset-only")) {
      const removed = await resetDemoData(pool);
      console.log(
        `Datos demo borrados: ${removed.actors} actores, ${removed.organizations} organizaciones.`,
      );
      if (args.has("--reset-only")) return;
    } else if (await demoDataExists(pool)) {
      throw new Error("Ya hay datos demo. Usa --reset para borrarlos y sembrar de nuevo.");
    }

    const ea = new DemoEaWorld();
    const systemActorId = await createSystemActor(pool, new Date());
    const context = createSeedContext({
      pool,
      ea,
      internalJobSecret: process.env.INTERNAL_JOB_SECRET || "demo-seed-secret",
      systemActorId,
    });

    console.log("• Cuentas");
    const people = await createPeople(
      pool,
      await hashPasswordLikeBetterAuth(DEMO_PASSWORD),
      context.now,
    );
    const players = new Map<string, PlayerRecord>();
    const onboardPlayer = async (
      account: Parameters<typeof onboard>[1],
      options: Parameters<typeof onboard>[2] = {},
    ) => {
      const known = players.get(account.actorId);
      if (known) return known;
      const record = await onboard(context, account, options);
      players.set(account.actorId, record);
      return record;
    };

    await seedAccessStates(context, people);
    await seedPersonalSpace(context, people, onboardPlayer);
    // Organizations are independent: seed them side by side.
    const [invitations] = await Promise.all([
      seedLigaAndina(context, people, onboardPlayer).then(async (liga) => {
        const links = await seedInvitations(context, people, liga, onboardPlayer);
        // multi-rol is a Liga Andina player first, then opens its own organization.
        await seedClubMulti(context, people);
        return links;
      }),
      seedBarrioFc(context, people, onboardPlayer),
      seedMegaLiga(context, people),
    ]);

    mkdirSync(dirname(DEMO_EA_WORLD_PATH), { recursive: true });
    writeFileSync(DEMO_EA_WORLD_PATH, `${JSON.stringify(ea.snapshot(new Date()), null, 2)}\n`);

    printSummary(people, invitations, context.warnings, Date.now() - startedAt);
  } finally {
    await pool.end();
  }
}

function printSummary(
  people: People,
  invitations: { onboardingToken: string | null; staffToken: string | null },
  warnings: readonly string[],
  elapsedMs: number,
): void {
  const rows = [...Object.values(people.named), people.squad[0]!, people.barrio[0]!].map(
    (account) => ({
      email: account.email,
      uso: people.specs.get(account.key)?.purpose ?? "",
    }),
  );
  console.log(
    `\nListo en ${Math.round(elapsedMs / 1000)} s. Contraseña de todas las cuentas: ${DEMO_PASSWORD}\n`,
  );
  console.table(rows);
  console.log(
    "Además: jugador01…jugador24 (plantillas de Liga Andina) y barrio01…barrio12 (capitanes de Barrio FC).",
  );
  if (invitations.onboardingToken) {
    console.log(
      `\nInvitación de onb-invitacion@: http://localhost:3000/invitations/accept/${invitations.onboardingToken}`,
    );
  }
  if (invitations.staffToken) {
    console.log(
      `Enlace de staff multiuso de Liga Andina: http://localhost:3000/invitations/accept/${invitations.staffToken}`,
    );
  }
  console.log(`\nEA falso para «Mis partidos» y syncs locales: npm run demo:ea -w @futrob/api`);
  console.log(`(datos en ${DEMO_EA_WORLD_PATH})`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} paso(s) no se pudieron sembrar:`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
}

main().catch((error: Error) => {
  console.error(`\nSeed demo falló: ${describeError(error)}`);
  if (error instanceof Error && error.stack) console.error(error.stack);
  process.exitCode = 1;
});
