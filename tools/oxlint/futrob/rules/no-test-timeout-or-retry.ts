import { defineRule } from "vite-plus/lint/plugins";
import type { Context, ESTree } from "vite-plus/lint/plugins";

import { isConfigurationCall, recordTestAlias, resolveTestApiChain } from "../shared/test-api.ts";

const FORBIDDEN_OPTIONS = new Set(["timeout", "retry"]);

function isFunction(node: ESTree.Node | undefined): boolean {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function propertyName(property: ESTree.ObjectExpression["properties"][number]): string | null {
  if (property.type !== "Property" || property.computed) return null;
  return property.key.type === "Identifier" ? property.key.name : null;
}

function reportForbiddenOptions(context: Context, options: ESTree.ObjectExpression): void {
  for (const property of options.properties) {
    const name = propertyName(property);
    if (name !== null && FORBIDDEN_OPTIONS.has(name)) {
      context.report({ node: property, messageId: name === "retry" ? "retry" : "timeout" });
    }
  }
}

/** Forbid per-test/per-hook timeouts and retries; tests must await the event they need. */
export const noTestTimeoutOrRetryRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow per-test and per-hook timeout/retry arguments in Vitest suites; await the specific event instead.",
    },
    messages: {
      timeout:
        "Do not set a per-test or per-hook timeout. Await the specific event or drain the work; slow suites set testTimeout in their Vitest project config.",
      retry: "Do not retry tests. Fix the flake at its source instead of retrying it.",
    },
  },
  create(context) {
    const aliases = new Set<string>();
    return {
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        recordTestAlias(node, aliases);
      },
      CallExpression(node: ESTree.CallExpression) {
        if (isConfigurationCall(node)) return;
        const chain = resolveTestApiChain(node, aliases);
        if (chain === null) return;
        const [first, second, third] = node.arguments;
        if (chain.kind === "hook") {
          if (isFunction(first) && second !== undefined) {
            context.report({ node: second, messageId: "timeout" });
          }
          return;
        }
        if (second?.type === "ObjectExpression") {
          reportForbiddenOptions(context, second);
          return;
        }
        if (isFunction(second) && third !== undefined) {
          if (third.type === "ObjectExpression") reportForbiddenOptions(context, third);
          else context.report({ node: third, messageId: "timeout" });
        }
      },
    };
  },
});
