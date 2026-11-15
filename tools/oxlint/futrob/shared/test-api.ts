import type { ESTree } from "vite-plus/lint/plugins";

const TEST_ROOTS = new Set([
  "it",
  "test",
  "describe",
  "suite",
  "bench",
  "xit",
  "xtest",
  "xdescribe",
]);
const HOOK_ROOTS = new Set(["beforeAll", "beforeEach", "afterAll", "afterEach"]);
/** Modifiers whose call configures the test instead of declaring it (`it.each(table)`). */
const CONFIG_CALLS = new Set(["each", "for", "skipIf", "runIf"]);

export type TestApiKind = "test" | "hook";

export type TestApiChain = Readonly<{
  kind: TestApiKind;
  root: string;
  modifiers: readonly string[];
}>;

function memberName(node: ESTree.MemberExpression): string | null {
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  return null;
}

function rootKind(name: string, aliases: ReadonlySet<string>): TestApiKind | null {
  if (TEST_ROOTS.has(name) || aliases.has(name)) return "test";
  if (HOOK_ROOTS.has(name)) return "hook";
  return null;
}

/** Resolve `describe.skipIf(x).each(t)` style chains to their Vitest root and modifiers. */
export function resolveTestApiChain(
  node: ESTree.Node,
  aliases: ReadonlySet<string>,
): TestApiChain | null {
  const modifiers: string[] = [];
  let current: ESTree.Node = node;
  for (;;) {
    if (current.type === "CallExpression") {
      current = current.callee;
      continue;
    }
    if (current.type === "MemberExpression") {
      const name = memberName(current);
      if (name === null) return null;
      modifiers.unshift(name);
      current = current.object;
      continue;
    }
    if (current.type !== "Identifier") return null;
    const kind = rootKind(current.name, aliases);
    return kind === null ? null : { kind, root: current.name, modifiers };
  }
}

/** True when the call configures a chain (`it.each(table)`) instead of declaring a test. */
export function isConfigurationCall(node: ESTree.CallExpression): boolean {
  if (node.callee.type !== "MemberExpression") return false;
  const name = memberName(node.callee);
  return name !== null && CONFIG_CALLS.has(name);
}

/** Track `const suite = describe.skipIf(!databaseUrl)` so `suite(...)` counts as a test call. */
export function recordTestAlias(node: ESTree.VariableDeclarator, aliases: Set<string>): void {
  if (node.id.type !== "Identifier" || node.init === null || node.init === undefined) return;
  const chain = resolveTestApiChain(node.init, aliases);
  if (chain?.kind === "test") aliases.add(node.id.name);
}
