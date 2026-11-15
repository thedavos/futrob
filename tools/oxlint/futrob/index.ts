import { eslintCompatPlugin } from "vite-plus/lint/plugins";

import { bcDependencyGraphRule } from "./rules/bc-dependency-graph.ts";
import { noCrossModuleAdapterImportRule } from "./rules/no-cross-module-adapter-import.ts";
import { noRawUseEffectRule } from "./rules/no-raw-use-effect.ts";
import { noUnparsedJsonBoundaryRule } from "./rules/no-unparsed-json-boundary.ts";
import { preferTaggedErrorRule } from "./rules/prefer-tagged-error.ts";
import { requireSkipTrackingIssueRule } from "./rules/require-skip-tracking-issue.ts";
import { noTestRetryRule, noTestTimeoutRule } from "./rules/test-run-options.ts";

/** Futrob-specific Oxlint rules for architecture and boundary parsing. */
const futrobPlugin = eslintCompatPlugin({
  meta: { name: "futrob" },
  rules: {
    "bc-dependency-graph": bcDependencyGraphRule,
    "no-cross-module-adapter-import": noCrossModuleAdapterImportRule,
    "no-raw-use-effect": noRawUseEffectRule,
    "no-test-retry": noTestRetryRule,
    "no-test-timeout": noTestTimeoutRule,
    "no-unparsed-json-boundary": noUnparsedJsonBoundaryRule,
    "prefer-tagged-error": preferTaggedErrorRule,
    "require-skip-tracking-issue": requireSkipTrackingIssueRule,
  },
});

export default futrobPlugin;
