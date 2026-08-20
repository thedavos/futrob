import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

const NATIVE_ERROR_CONSTRUCTORS = new Set([
  "AggregateError",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

function isNativeErrorCallee(callee: ESTree.Expression): boolean {
  return callee.type === "Identifier" && NATIVE_ERROR_CONSTRUCTORS.has(callee.name);
}

function throwsNativeError(node: ESTree.ThrowStatement): boolean {
  const argument = node.argument;
  if (argument === null) return false;
  return (
    (argument.type === "NewExpression" || argument.type === "CallExpression") &&
    isNativeErrorCallee(argument.callee)
  );
}

function extendsNativeError(node: ESTree.Class): boolean {
  return node.superClass !== null && isNativeErrorCallee(node.superClass);
}

/** Keep expected failures and defects explicit in domain and application layers. */
export const preferTaggedErrorRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow native Error construction in domain/application code; use TaggedError for expected failures and Panic for defects.",
    },
    messages: {
      nativeError:
        "Use a TaggedError subclass with a stable code for expected failures, or Panic for an invariant defect. Do not use a native Error directly.",
      nativeErrorSubclass:
        "Extend TaggedError for an expected failure. Native Error subclasses do not provide Futrob's stable error contract.",
    },
  },
  createOnce(context) {
    return {
      ClassDeclaration(node: ESTree.Class) {
        if (!extendsNativeError(node)) return;
        context.report({ node, messageId: "nativeErrorSubclass" });
      },
      ClassExpression(node: ESTree.Class) {
        if (!extendsNativeError(node)) return;
        context.report({ node, messageId: "nativeErrorSubclass" });
      },
      ThrowStatement(node: ESTree.ThrowStatement) {
        if (!throwsNativeError(node)) return;
        context.report({ node, messageId: "nativeError" });
      },
    };
  },
});
