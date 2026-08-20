export type AdapterImportTarget = Readonly<{
  app: "api" | "web";
  owner: string;
}>;

const WEB_MODULE_ADAPTER_ALIAS = /^@\/modules\/([a-z0-9-]+)\/adapters\//;
const WEB_MODULE_ADAPTER_PATH = /\/apps\/web\/src\/modules\/([a-z0-9-]+)\/adapters\//;
const API_ADAPTER_ALIAS = /^@\/adapters\/([a-z0-9-]+)\//;
const API_ADAPTER_PATH = /\/apps\/api\/src\/adapters\/([a-z0-9-]+)\//;
const SHARED_API_ADAPTER_OWNERS = new Set(["persistence"]);

/** Composition roots that may wire adapters across modules. */
const WEB_COMPOSITION_ROOTS = ["/apps/web/src/di/"];

const API_COMPOSITION_ROOTS = ["/apps/api/src/di/"];

export function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function resolveImportPath(importerPath: string, source: string): string {
  if (source.startsWith("/")) return normalizePath(source);
  const importerSegments = normalizePath(importerPath).split("/");
  importerSegments.pop();

  for (const segment of source.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      importerSegments.pop();
      continue;
    }
    importerSegments.push(segment);
  }

  return importerSegments.join("/");
}

export function isTestOrFixtureFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    /\.(test|spec)\.[cm]?tsx?$/.test(normalized) ||
    normalized.endsWith(".fixture.ts") ||
    normalized.includes("/fixtures/")
  );
}

export function isWebCompositionRoot(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return WEB_COMPOSITION_ROOTS.some((root) => normalized.includes(root));
}

export function isApiCompositionRoot(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return API_COMPOSITION_ROOTS.some((root) => normalized.includes(root));
}

export function webOwnerModule(filePath: string): string | null {
  const match = normalizePath(filePath).match(/\/apps\/web\/src\/modules\/([a-z0-9-]+)\//);
  return match?.[1] ?? null;
}

export function apiOwnerModule(filePath: string): string | null {
  const match = normalizePath(filePath).match(/\/apps\/api\/src\/adapters\/([a-z0-9-]+)\//);
  return match?.[1] ?? null;
}

function targetFromMatch(
  app: AdapterImportTarget["app"],
  match: RegExpMatchArray | null,
): AdapterImportTarget | null {
  const owner = match?.[1];
  if (owner === undefined) return null;
  if (app === "api" && SHARED_API_ADAPTER_OWNERS.has(owner)) return null;
  return { app, owner };
}

export function adapterImportTarget(
  source: string,
  importerPath: string,
): AdapterImportTarget | null {
  const webAliasTarget = targetFromMatch("web", source.match(WEB_MODULE_ADAPTER_ALIAS));
  if (webAliasTarget !== null) return webAliasTarget;

  const apiAliasTarget = targetFromMatch("api", source.match(API_ADAPTER_ALIAS));
  if (apiAliasTarget !== null) return apiAliasTarget;

  if (!source.startsWith(".") && !source.startsWith("/")) return null;
  const resolvedPath = resolveImportPath(importerPath, source);
  return (
    targetFromMatch("web", resolvedPath.match(WEB_MODULE_ADAPTER_PATH)) ??
    targetFromMatch("api", resolvedPath.match(API_ADAPTER_PATH))
  );
}

export function importerOwner(target: AdapterImportTarget, importerPath: string): string | null {
  return target.app === "web" ? webOwnerModule(importerPath) : apiOwnerModule(importerPath);
}

export function isCompositionRoot(target: AdapterImportTarget, importerPath: string): boolean {
  return target.app === "web"
    ? isWebCompositionRoot(importerPath)
    : isApiCompositionRoot(importerPath);
}
