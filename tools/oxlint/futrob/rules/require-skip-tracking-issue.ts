import { defineRule } from "vite-plus/lint/plugins";
import type { Context, ESTree } from "vite-plus/lint/plugins";

import { recordTestAlias, resolveTestApiChain } from "../shared/test-api.ts";

const DISABLED_MODIFIERS = new Set(["skip", "todo"]);
const DISABLED_ROOTS = new Set(["xit", "xtest", "xdescribe"]);
/** A comment line citing a GitHub issue: `// TODO(#123): …` or an `/issues/123` URL. */
const TRACKED_COMMENT = /^\s*(?:\/\/|\/?\*).*(?:#\d+|\/issues\/\d+)/;

function previousLine(text: string, offset: number): string {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  if (lineStart === 0) return "";
  const previousStart = text.lastIndexOf("\n", lineStart - 2) + 1;
  return text.slice(previousStart, lineStart - 1);
}

function isTracked(context: Context, node: ESTree.Node): boolean {
  return TRACKED_COMMENT.test(previousLine(context.sourceCode.text, node.start));
}

function reportUntracked(context: Context, node: ESTree.Node): void {
  if (!isTracked(context, node)) context.report({ node, messageId: "untrackedSkip" });
}

/** Skipped or todo tests must cite a tracking issue on the line directly above. */
export const requireSkipTrackingIssueRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a tracking-issue comment on the line above it.skip/describe.skip/it.todo and x-prefixed tests.",
    },
    messages: {
      untrackedSkip:
        "Skipped tests need a tracking issue in a comment on the line directly above (e.g. `// TODO(#123): …`). Gate missing env prerequisites with skipIf/runIf instead.",
    },
  },
  create(context) {
    const aliases = new Set<string>();
    return {
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        recordTestAlias(node, aliases);
      },
      MemberExpression(node: ESTree.MemberExpression) {
        if (node.computed || node.property.type !== "Identifier") return;
        if (!DISABLED_MODIFIERS.has(node.property.name)) return;
        if (resolveTestApiChain(node.object, aliases)?.kind !== "test") return;
        reportUntracked(context, node);
      },
      CallExpression(node: ESTree.CallExpression) {
        if (node.callee.type !== "Identifier" || !DISABLED_ROOTS.has(node.callee.name)) return;
        reportUntracked(context, node);
      },
    };
  },
});
