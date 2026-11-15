/**
 * Local EA Clubs stand-in for demo data: answers for the demo clubs and forwards every
 * other request to the real EA API, so real clubs keep working.
 *
 *   npm run demo:ea -w @futrob/api
 *   # apps/api/.env → EA_CLUBS_BASE_URL=http://localhost:8790/api/fc, then restart the API
 *
 * Reads the world the last `seed:demo` wrote to apps/api/.demo/ea-world.json.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DemoEaWorld, type DemoEaWorldSnapshot } from "./fake-ea.ts";

const here = dirname(fileURLToPath(import.meta.url));
const worldPath = resolve(here, "../../.demo/ea-world.json");
const port = Number(process.env.DEMO_EA_PORT ?? "8790");
const upstream = (process.env.EA_CLUBS_UPSTREAM_URL ?? "https://proclubs.ea.com/api/fc").replace(
  /\/$/,
  "",
);
const BASE_PATH = "/api/fc";

if (!existsSync(worldPath)) {
  console.error(`No existe ${worldPath}. Ejecuta primero: npm run seed:demo -w @futrob/api`);
  process.exit(1);
}

let loadedAt = -1;
let world: DemoEaWorld | undefined;
function currentWorld(): DemoEaWorld {
  // Reload after a new seed without restarting the server.
  const modifiedAt = statSync(worldPath).mtimeMs;
  if (!world || modifiedAt !== loadedAt) {
    const snapshot: unknown = JSON.parse(readFileSync(worldPath, "utf8"));
    // SAFETY: the file is written only by `seed:demo` from `DemoEaWorld.snapshot()`.
    world = DemoEaWorld.fromSnapshot(snapshot as DemoEaWorldSnapshot);
    loadedAt = modifiedAt;
  }
  return world;
}

const forward: typeof fetch = async (input, init) => {
  const url = new URL(new Request(input).url);
  const path = url.pathname.startsWith(BASE_PATH)
    ? url.pathname.slice(BASE_PATH.length)
    : url.pathname;
  return fetch(`${upstream}${path}${url.search}`, init);
};

createServer(async (request, response) => {
  try {
    const url = `http://localhost:${port}${request.url ?? "/"}`;
    const headers = new Headers();
    for (const [index, name] of request.rawHeaders.entries()) {
      // rawHeaders alternates names and values.
      if (index % 2 === 1 || name.toLowerCase() === "host") continue;
      headers.append(name, request.rawHeaders[index + 1] ?? "");
    }
    const answer = await currentWorld().fetcher(forward)(url, { method: request.method, headers });
    response.writeHead(answer.status, { "content-type": "application/json" });
    response.end(Buffer.from(await answer.arrayBuffer()));
    console.log(`${answer.status} ${request.method} ${request.url}`);
  } catch (error) {
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: String(error) }));
  }
}).listen(port, () => {
  console.log(`EA demo en http://localhost:${port}${BASE_PATH} (resto → ${upstream})`);
});
