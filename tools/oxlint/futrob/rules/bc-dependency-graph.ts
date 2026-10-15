import { defineRule } from "vite-plus/lint/plugins";
import type { Context, ESTree } from "vite-plus/lint/plugins";

import {
  forbiddenInfraSpecifier,
  importerBoundedContext,
  isAllowedBcImport,
  isBoundedContext,
  parseFutrobSpecifier,
  relativeImportEscapesPackage,
} from "../shared/bc-graph.ts";
import { isTestOrFixtureFile, normalizePath } from "../shared/module-paths.ts";

function checkImportSource(
  context: Context,
  node: ESTree.Node,
  source: string,
  filePath: string,
): void {
  const normalizedPath = normalizePath(filePath);
  if (isTestOrFixtureFile(normalizedPath)) return;

  const importer = importerBoundedContext(normalizedPath);
  if (importer === null) return;

  if (relativeImportEscapesPackage(normalizedPath, source)) {
    context.report({
      node,
      messageId: "relativeEscape",
      data: { importer, specifier: source },
    });
    return;
  }

  const infra = forbiddenInfraSpecifier(source);
  if (infra !== null) {
    context.report({
      node,
      messageId: "infraImport",
      data: { specifier: source },
    });
    return;
  }

  const futrob = parseFutrobSpecifier(source);
  if (futrob === null) return;

  if (futrob.subpath !== null) {
    context.report({
      node,
      messageId: "deepImport",
      data: { packageName: futrob.name, specifier: source },
    });
    return;
  }

  if (!isBoundedContext(futrob.name)) return;
  if (isAllowedBcImport(importer, futrob.name)) return;

  context.report({
    node,
    messageId: "disallowedBc",
    data: { importer, imported: futrob.name },
  });
}

function checkDynamicImport(
  context: Context,
  node: ESTree.ImportExpression,
  filePath: string,
): void {
  const raw = node.source.type === "Literal" ? node.source.raw : null;
  if (
    node.source.type !== "Literal" ||
    raw === null ||
    (!raw.startsWith('"') && !raw.startsWith("'"))
  ) {
    return;
  }
  checkImportSource(context, node.source, String(node.source.value), filePath);
}

/** Enforce the BC DAG, public-API-only package imports, and no infra in BC packages. */
export const bcDependencyGraphRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce the bounded-context dependency graph, ban deep @futrob imports, relative escapes, and infrastructure packages from packages/<bc>/src.",
    },
    messages: {
      disallowedBc:
        "Bounded context '{{importer}}' must not import @futrob/{{imported}}. Allowed edges live in docs/architecture/dependency-graph.md and tools/oxlint/futrob/shared/bc-graph.ts; update both together.",
      deepImport:
        "Import @futrob/{{packageName}} only through its public API (@futrob/{{packageName}}). Deep import '{{specifier}}' is not allowed.",
      relativeEscape:
        "Relative import '{{specifier}}' leaves packages/{{importer}}. Cross-package imports must use @futrob/<bc> public APIs.",
      infraImport:
        "Bounded-context packages must not import '{{specifier}}'. Persistence, HTTP frameworks, runtimes, SDK, UI, and logging belong in app adapters.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node: ESTree.ImportDeclaration) {
        checkImportSource(context, node.source, node.source.value, context.getFilename());
      },
      ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
        if (node.source === null) return;
        checkImportSource(context, node.source, node.source.value, context.getFilename());
      },
      ExportAllDeclaration(node: ESTree.ExportAllDeclaration) {
        checkImportSource(context, node.source, node.source.value, context.getFilename());
      },
      ImportExpression(node: ESTree.ImportExpression) {
        checkDynamicImport(context, node, context.getFilename());
      },
      TSImportType(node: ESTree.TSImportType) {
        checkImportSource(context, node.source, node.source.value, context.getFilename());
      },
    };
  },
});
