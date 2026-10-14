import { defineRule } from "@oxlint/plugins";
import type { Context, ESTree } from "@oxlint/plugins";

import { normalizePath } from "../shared/module-paths.ts";

const FORBIDDEN_HOOKS = new Set(["useEffect", "useLayoutEffect"]);
const REACT_SOURCES = new Set(["react", "react-dom", "react/index"]);
const SCOPED_ROOTS = ["/apps/web/", "/apps/mobile/", "/packages/ui/"];
const HATCH_SUFFIX = "/packages/ui/src/hooks/use-external-sync.ts";
const DISABLE_COMMENT = /(?:eslint|oxlint|oxc)-disable(?:-next-line|-line)?\b/;
const DISABLE_RULE = /(?:futrob\/)?no-raw-use-effect\b/;

const RAW_USE_EFFECT_MESSAGE =
  "Do not import or call raw useEffect/useLayoutEffect. Derive during render, handle the event, reset with key, use useSyncExternalStore, or TanStack Query for data. Synchronize with an external system only through useExternalSync from @futrob/ui.";

function isReactSource(value: string): boolean {
  return REACT_SOURCES.has(value);
}

function isScopedReactFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return SCOPED_ROOTS.some((root) => normalized.includes(root));
}

function isHatchModule(filePath: string): boolean {
  return normalizePath(filePath).endsWith(HATCH_SUFFIX);
}

function hookNameFromNode(node: ESTree.Node): string | null {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "Literal") return null;
  return node.value === "useEffect" || node.value === "useLayoutEffect" ? node.value : null;
}

function isForbiddenHookName(name: string | null): name is string {
  return name !== null && FORBIDDEN_HOOKS.has(name);
}

function importedHookName(specifier: ESTree.ImportSpecifier): string | null {
  return hookNameFromNode(specifier.imported);
}

function exportedHookName(specifier: ESTree.ExportSpecifier): string | null {
  return hookNameFromNode(specifier.local);
}

function memberHookName(node: ESTree.MemberExpression): string | null {
  if (node.computed) return hookNameFromNode(node.property);
  return node.property.type === "Identifier" ? node.property.name : null;
}

function report(context: Context, node: ESTree.Node): void {
  context.report({ node, messageId: "rawUseEffect" });
}

function checkDisableComments(context: Context, program: ESTree.Program): void {
  for (const comment of program.comments) {
    const text = comment.value;
    if (!DISABLE_COMMENT.test(text) || !DISABLE_RULE.test(text)) continue;
    context.report({ node: comment, messageId: "disableComment" });
  }
}

/** Forbid raw React effect hooks outside the useExternalSync escape hatch. */
export const noRawUseEffectRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing or calling useEffect/useLayoutEffect in Futrob React code; use useExternalSync or a non-effect alternative.",
    },
    messages: {
      rawUseEffect: RAW_USE_EFFECT_MESSAGE,
      disableComment:
        "Do not disable futrob/no-raw-use-effect. Use a non-effect alternative or useExternalSync from @futrob/ui.",
    },
  },
  create(context) {
    const filePath = context.filename;
    if (!isScopedReactFile(filePath)) return {};
    if (isHatchModule(filePath)) return {};

    const reactNamespaces = new Set<string>();

    return {
      Program(node: ESTree.Program) {
        checkDisableComments(context, node);
      },
      ImportDeclaration(node: ESTree.ImportDeclaration) {
        if (node.importKind === "type" || !isReactSource(node.source.value)) return;
        for (const specifier of node.specifiers) {
          switch (specifier.type) {
            case "ImportSpecifier":
              if (specifier.importKind === "type") continue;
              if (isForbiddenHookName(importedHookName(specifier))) report(context, specifier);
              break;
            case "ImportDefaultSpecifier":
            case "ImportNamespaceSpecifier":
              reactNamespaces.add(specifier.local.name);
              break;
            default: {
              const exhaustive: never = specifier;
              void exhaustive;
              break;
            }
          }
        }
      },
      ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
        if (
          node.source === null ||
          node.exportKind === "type" ||
          !isReactSource(node.source.value)
        ) {
          return;
        }
        for (const specifier of node.specifiers) {
          if (isForbiddenHookName(exportedHookName(specifier))) report(context, specifier);
        }
      },
      MemberExpression(node: ESTree.MemberExpression) {
        if (!isForbiddenHookName(memberHookName(node))) return;
        if (node.object.type === "Identifier" && reactNamespaces.has(node.object.name)) {
          report(context, node);
          return;
        }
        if (node.object.type === "Identifier" && node.object.name === "React") {
          report(context, node);
        }
      },
      CallExpression(node: ESTree.CallExpression) {
        if (node.callee.type !== "Identifier") return;
        if (isForbiddenHookName(node.callee.name)) report(context, node.callee);
      },
    };
  },
});
