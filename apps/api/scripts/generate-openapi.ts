import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { buildOpenApiDocument } from "../src/http/openapi/build-document.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "../../../packages/api-contracts/openapi");
mkdirSync(outDir, { recursive: true });

const document = buildOpenApiDocument();
const jsonPath = join(outDir, "openapi.json");
const yamlPath = join(outDir, "openapi.yaml");

writeFileSync(jsonPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
writeFileSync(yamlPath, stringify(document), "utf8");

console.warn(`Wrote ${jsonPath}`);
console.warn(`Wrote ${yamlPath}`);
