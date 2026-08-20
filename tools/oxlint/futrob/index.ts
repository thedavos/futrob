import { eslintCompatPlugin } from "@oxlint/plugins";

import { noCrossModuleAdapterImportRule } from "./rules/no-cross-module-adapter-import.ts";
import { noUnparsedJsonBoundaryRule } from "./rules/no-unparsed-json-boundary.ts";
import { preferTaggedErrorRule } from "./rules/prefer-tagged-error.ts";

/** Futrob-specific Oxlint rules for architecture and boundary parsing. */
const futrobPlugin = eslintCompatPlugin({
  meta: { name: "futrob" },
  rules: {
    "no-cross-module-adapter-import": noCrossModuleAdapterImportRule,
    "no-unparsed-json-boundary": noUnparsedJsonBoundaryRule,
    "prefer-tagged-error": preferTaggedErrorRule,
  },
});

export default futrobPlugin;
