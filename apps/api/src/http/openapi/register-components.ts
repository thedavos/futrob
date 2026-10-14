import type { ZodType } from "zod";
import * as components from "@/http/openapi/components.ts";

type SchemaRegistry = {
  register(name: string, schema: ZodType): void;
};

export function registerNamedComponents(registry: SchemaRegistry): void {
  for (const [name, schema] of Object.entries(components)) {
    registry.register(name, schema);
  }
}
