import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const clientOutputDirectory = path.join(repositoryRoot, "apps/web/dist/client");
const clientAssetsDirectory = path.join(clientOutputDirectory, "assets");
const clientManifestPath = path.join(clientOutputDirectory, ".vite/manifest.json");

const entryBudgetKiB = readBudget("BUNDLE_ENTRY_GZIP_KIB", 250);
const lazyBudgetKiB = readBudget("BUNDLE_LAZY_GZIP_KIB", 100);

assertBuildOutputExists();

const manifest = JSON.parse(readFileSync(clientManifestPath, "utf8"));
const entryFiles = new Set(
  Object.values(manifest)
    .filter((chunk) => chunk.isEntry === true && chunk.file.endsWith(".js"))
    .map((chunk) => chunk.file),
);
const assetFiles = readdirSync(clientAssetsDirectory)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => `assets/${fileName}`);

if (entryFiles.size === 0) {
  fail(`No JavaScript entry was found in ${relative(clientManifestPath)}.`);
}

const measurements = assetFiles
  .map((file) => measure(file, entryFiles.has(file) ? "entry" : "lazy/shared"))
  .sort((left, right) => right.gzipBytes - left.gzipBytes);
const violations = measurements.filter(({ gzipKiB, kind }) =>
  kind === "entry" ? gzipKiB > entryBudgetKiB : gzipKiB > lazyBudgetKiB,
);

const report = [
  "Product client JavaScript budget (gzip)",
  `  Scope: ${relative(clientAssetsDirectory)} (SSR and Storybook excluded)`,
  `  Entry limit: ${entryBudgetKiB.toFixed(0)} KiB`,
  `  Lazy/shared limit: ${lazyBudgetKiB.toFixed(0)} KiB`,
  ...measurements.slice(0, 10).map(({ file, gzipKiB, kind }) => {
    const limit = kind === "entry" ? entryBudgetKiB : lazyBudgetKiB;
    return `  ${kind.padEnd(11)} ${gzipKiB.toFixed(2).padStart(7)} / ${limit.toFixed(0)} KiB  ${file}`;
  }),
];

process.stdout.write(`${report.join("\n")}\n`);

if (violations.length > 0) {
  const details = violations
    .map(({ file, gzipKiB, kind }) => {
      const limit = kind === "entry" ? entryBudgetKiB : lazyBudgetKiB;
      return `${file}: ${gzipKiB.toFixed(2)} KiB exceeds the ${limit.toFixed(0)} KiB ${kind} limit`;
    })
    .join("\n");
  fail(`Client bundle budget exceeded:\n${details}`);
}

function measure(file, kind) {
  const absolutePath = path.join(clientOutputDirectory, file);
  const source = readFileSync(absolutePath);
  const gzipBytes = gzipSync(source, { level: 9 }).byteLength;
  return {
    file,
    gzipBytes,
    gzipKiB: gzipBytes / 1024,
    kind,
  };
}

function readBudget(variableName, fallback) {
  const rawValue = process.env[variableName];
  if (rawValue == null) {
    return fallback;
  }
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    fail(`${variableName} must be a positive number, received ${JSON.stringify(rawValue)}.`);
  }
  return parsedValue;
}

function assertBuildOutputExists() {
  for (const outputPath of [clientAssetsDirectory, clientManifestPath]) {
    if (!existsSync(outputPath)) {
      fail(`Missing ${relative(outputPath)}. Run npm run build before the bundle budget.`);
    }
  }
}

function relative(absolutePath) {
  return path.relative(repositoryRoot, absolutePath);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
