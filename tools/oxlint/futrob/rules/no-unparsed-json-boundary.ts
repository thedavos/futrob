import { defineRule } from "@oxlint/plugins";

import { resolveVariable } from "../../shared/resolve-variable.ts";

import type { ESTree, SourceCode } from "@oxlint/plugins";

const ALLOWED_PARSE_HELPERS = new Set([
  "parseResponse",
  "parseJsonColumn",
  "parseJsonColumnOrNull",
]);

function isJsonBoundaryCall(node: ESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    if (callee.property.name === "json" && node.arguments.length === 0) return true;
  }

  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier"
  ) {
    return (
      callee.object.name === "JSON" &&
      callee.property.type === "Identifier" &&
      callee.property.name === "parse"
    );
  }

  return false;
}

function calleeName(callee: ESTree.Expression): string | null {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return null;
}

function schemaExpressionName(expression: ESTree.Expression): string | null {
  if (expression.type === "Identifier") return expression.name;
  if (
    expression.type === "MemberExpression" &&
    !expression.computed &&
    expression.property.type === "Identifier"
  ) {
    return expression.property.name;
  }
  return null;
}

function isZodFactoryExpression(expression: ESTree.Expression): boolean {
  if (expression.type !== "CallExpression") return false;
  const callee = expression.callee;
  if (callee.type !== "MemberExpression" || callee.computed) return false;
  if (callee.object.type === "Identifier" && callee.object.name === "z") return true;
  return isZodFactoryExpression(callee.object);
}

function isSchemaExpression(expression: ESTree.Expression): boolean {
  const name = schemaExpressionName(expression);
  return (
    name === "schema" ||
    (name !== null && /schema$/i.test(name)) ||
    isZodFactoryExpression(expression)
  );
}

function isAllowedParseWrapper(call: ESTree.CallExpression): boolean {
  const name = calleeName(call.callee);
  if (name !== null && ALLOWED_PARSE_HELPERS.has(name)) return true;
  return (
    (name === "parse" || name === "safeParse") &&
    call.callee.type === "MemberExpression" &&
    isSchemaExpression(call.callee.object)
  );
}

function isUnknownLikeType(type: ESTree.TSType): boolean {
  if (type.type === "TSUnknownKeyword" || type.type === "TSAnyKeyword") return true;
  if (type.type === "TSParenthesizedType") return isUnknownLikeType(type.typeAnnotation);
  if (type.type === "TSUnionType") return type.types.some(isUnknownLikeType);
  if (
    type.type === "TSTypeReference" &&
    type.typeName.type === "Identifier" &&
    (type.typeName.name === "Promise" || type.typeName.name === "PromiseLike")
  ) {
    const valueType = type.typeArguments?.params[0];
    return valueType !== undefined && isUnknownLikeType(valueType);
  }
  return false;
}

function isConcreteAnnotation(annotation: ESTree.TSTypeAnnotation | null | undefined): boolean {
  return (
    annotation !== null && annotation !== undefined && !isUnknownLikeType(annotation.typeAnnotation)
  );
}

function bindingAnnotation(
  pattern: ESTree.BindingPattern,
): ESTree.TSTypeAnnotation | null | undefined {
  switch (pattern.type) {
    case "Identifier":
    case "ObjectPattern":
    case "ArrayPattern":
      return pattern.typeAnnotation;
    case "AssignmentPattern":
      return bindingAnnotation(pattern.left);
    default: {
      const _exhaustive: never = pattern;
      return _exhaustive;
    }
  }
}

function declaredAnnotation(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): ESTree.TSTypeAnnotation | null | undefined {
  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null || variable.defs.length !== 1) return null;
  const [definition] = variable.defs;
  if (definition?.type !== "Variable" || definition.node.type !== "VariableDeclarator") {
    return null;
  }
  return bindingAnnotation(definition.node.id);
}

type FunctionWithReturnType = ESTree.ArrowFunctionExpression | ESTree.Function;

function enclosingFunction(node: ESTree.Node): FunctionWithReturnType | null {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== "Program") {
    if (
      current.type === "ArrowFunctionExpression" ||
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression"
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function isUnsafeConcreteConsumption(sourceCode: SourceCode, node: ESTree.CallExpression): boolean {
  let current: ESTree.Node = node;
  while (true) {
    const parent: ESTree.Node | null = current.parent;
    if (parent === null || parent.type === "Program") return false;
    // This is intentionally a partial consumer classifier; unrelated AST parents are safe exits.
    // eslint-disable-next-line typescript/switch-exhaustiveness-check
    switch (parent.type) {
      case "AwaitExpression":
      case "ChainExpression":
      case "ParenthesizedExpression":
      case "TSNonNullExpression":
        current = parent;
        continue;
      case "MemberExpression":
        if (parent.object !== current) return false;
        current = parent;
        continue;
      case "CallExpression":
        if (parent.callee === current) {
          current = parent;
          continue;
        }
        if (isAllowedParseWrapper(parent) || calleeName(parent.callee) === "expect") {
          return false;
        }
        current = parent;
        continue;
      case "Property":
        if (parent.value !== current) return false;
        current = parent;
        continue;
      case "ObjectExpression":
      case "ArrayExpression":
      case "SpreadElement":
      case "ConditionalExpression":
      case "LogicalExpression":
        current = parent;
        continue;
      case "TSAsExpression":
      case "TSTypeAssertion":
      case "TSSatisfiesExpression":
        return !isUnknownLikeType(parent.typeAnnotation);
      case "VariableDeclarator":
        return isConcreteAnnotation(bindingAnnotation(parent.id));
      case "AssignmentExpression":
        return (
          parent.left.type === "Identifier" &&
          isConcreteAnnotation(declaredAnnotation(sourceCode, parent.left))
        );
      case "ReturnStatement": {
        const owner = enclosingFunction(parent);
        return isConcreteAnnotation(owner?.returnType);
      }
      case "ArrowFunctionExpression":
        return parent.body === current && isConcreteAnnotation(parent.returnType);
      case "PropertyDefinition":
      case "TSAbstractPropertyDefinition":
        return isConcreteAnnotation(parent.typeAnnotation);
      default:
        return false;
    }
  }
}

/** Require schema or helper parsing before trusting JSON boundary values. */
export const noUnparsedJsonBoundaryRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow assigning response.json() or JSON.parse() to concrete types without Zod parse or approved helpers.",
    },
    messages: {
      unparsed:
        "Parse untrusted JSON at the boundary with `.parse()` / `.safeParse()`, `parseResponse`, or `parseJsonColumn`, or assign to `unknown` first.",
    },
  },
  create(context) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (!isJsonBoundaryCall(node)) return;
        if (!isUnsafeConcreteConsumption(context.sourceCode, node)) return;
        context.report({ node, messageId: "unparsed" });
      },
    };
  },
});
