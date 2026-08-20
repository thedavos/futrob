import { defineRule } from "@oxlint/plugins";
import type { Context, ESTree } from "@oxlint/plugins";

import {
  adapterImportTarget,
  importerOwner,
  isCompositionRoot,
  isTestOrFixtureFile,
  normalizePath,
} from "../shared/module-paths.ts";

function reportCrossModuleImport(
  context: Context,
  node: ESTree.Node,
  importerOwner: string | null,
  adapterOwner: string,
): void {
  if (importerOwner === adapterOwner) return;
  context.report({
    node,
    messageId: "crossModuleAdapter",
    data: { adapterOwner, importerOwner: importerOwner ?? "composition-external" },
  });
}

function checkImportSource(
  context: Context,
  node: ESTree.Node,
  source: string,
  filePath: string,
): void {
  const normalizedPath = normalizePath(filePath);
  if (isTestOrFixtureFile(normalizedPath)) return;

  const target = adapterImportTarget(source, normalizedPath);
  if (target === null || isCompositionRoot(target, normalizedPath)) return;
  reportCrossModuleImport(context, node, importerOwner(target, normalizedPath), target.owner);
}

/** Disallow importing another module's adapters outside composition roots. */
export const noCrossModuleAdapterImportRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow importing adapters from a different bounded-context module.",
    },
    messages: {
      crossModuleAdapter:
        "Import adapters only from the owning module ({{adapterOwner}}), not from {{importerOwner}}. Use @futrob/<bc> public APIs, module facades, or apps/*/src/di wiring.",
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
        const raw = node.source.type === "Literal" ? node.source.raw : null;
        if (
          node.source.type !== "Literal" ||
          raw === null ||
          (!raw.startsWith('"') && !raw.startsWith("'"))
        ) {
          return;
        }
        checkImportSource(context, node.source, String(node.source.value), context.getFilename());
      },
    };
  },
});
