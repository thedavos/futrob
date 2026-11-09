import { defineRule } from "vite-plus/lint/plugins";
import type { ESTree } from "vite-plus/lint/plugins";

import { isConfigurationCall, recordTestAlias, resolveTestApiChain } from "../shared/test-api.ts";

type TestRunOption = "timeout" | "retry";

type Violation = Readonly<{ node: ESTree.Node; option: TestRunOption }>;

function isFunction(node: ESTree.Node | undefined): boolean {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function propertyName(property: ESTree.ObjectExpression["properties"][number]): string | null {
  if (property.type !== "Property" || property.computed) return null;
  return property.key.type === "Identifier" ? property.key.name : null;
}

function optionViolations(options: ESTree.ObjectExpression): Violation[] {
  return options.properties.flatMap((property) => {
    const name = propertyName(property);
    return name === "timeout" || name === "retry" ? [{ node: property, option: name }] : [];
  });
}

/** Per-test/per-hook timeout and retry arguments passed to a Vitest test or hook call. */
function testRunOptionViolations(
  node: ESTree.CallExpression,
  aliases: ReadonlySet<string>,
): Violation[] {
  if (isConfigurationCall(node)) return [];
  const chain = resolveTestApiChain(node, aliases);
  if (chain === null) return [];
  const [first, second, third] = node.arguments;
  if (chain.kind === "hook") {
    return isFunction(first) && second !== undefined ? [{ node: second, option: "timeout" }] : [];
  }
  if (second?.type === "ObjectExpression") return optionViolations(second);
  if (isFunction(second) && third !== undefined) {
    return third.type === "ObjectExpression"
      ? optionViolations(third)
      : [{ node: third, option: "timeout" }];
  }
  return [];
}

function testRunOptionRule(option: TestRunOption, description: string, message: string) {
  return defineRule({
    meta: { type: "problem", docs: { description }, messages: { [option]: message } },
    create(context) {
      const aliases = new Set<string>();
      return {
        VariableDeclarator(node: ESTree.VariableDeclarator) {
          recordTestAlias(node, aliases);
        },
        CallExpression(node: ESTree.CallExpression) {
          for (const violation of testRunOptionViolations(node, aliases)) {
            if (violation.option === option) {
              context.report({ node: violation.node, messageId: option });
            }
          }
        },
      };
    },
  });
}

/** Forbid per-test/per-hook timeouts; tests must await the event they need. */
export const noTestTimeoutRule = testRunOptionRule(
  "timeout",
  "Disallow per-test and per-hook timeout arguments in Vitest suites; await the specific event instead.",
  "Do not set a per-test or per-hook timeout. Await the specific event or drain the work; slow suites set testTimeout in their Vitest project config.",
);

/** Forbid test retries everywhere, including files on the legacy timeout allowlist. */
export const noTestRetryRule = testRunOptionRule(
  "retry",
  "Disallow retry options in Vitest suites; fix the flake at its source instead.",
  "Do not retry tests. Fix the flake at its source instead of retrying it.",
);
