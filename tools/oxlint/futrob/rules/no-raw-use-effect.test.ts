import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { noRawUseEffectRule } from "./no-raw-use-effect.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { lang: "ts" },
    sourceType: "module",
  },
});

const webFile = "/repo/apps/web/src/widget.tsx";
const mobileFile = "/repo/apps/mobile/src/widget.tsx";
const uiFile = "/repo/packages/ui/src/components/widget.tsx";
const hatchFile = "/repo/packages/ui/src/hooks/use-external-sync.ts";
const apiFile = "/repo/apps/api/src/server.ts";

ruleTester.run("no-raw-use-effect", noRawUseEffectRule, {
  valid: [
    {
      name: "allows useExternalSync in web",
      filename: webFile,
      code: `
        import { useExternalSync } from "@futrob/ui";
        useExternalSync(() => () => undefined, []);
      `,
    },
    {
      name: "allows useExternalSync in mobile",
      filename: mobileFile,
      code: `
        import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";
        useExternalSync(() => undefined, [id]);
      `,
    },
    {
      name: "allows raw useEffect inside the hatch module",
      filename: hatchFile,
      code: `
        import { useEffect, type DependencyList, type EffectCallback } from "react";
        export function useExternalSync(effect: EffectCallback, deps: DependencyList): void {
          useEffect(effect, deps);
        }
      `,
    },
    {
      name: "allows useEffect outside React app packages",
      filename: apiFile,
      code: `
        import { useEffect } from "react";
        useEffect(() => undefined, []);
      `,
    },
    {
      name: "allows unrelated React hooks",
      filename: uiFile,
      code: `
        import { useMemo, useState } from "react";
        const [value, setValue] = useState(0);
        const doubled = useMemo(() => value * 2, [value]);
        void setValue;
        void doubled;
      `,
    },
  ],
  invalid: [
    {
      name: "rejects a direct useEffect import and call",
      filename: webFile,
      code: `
        import { useEffect } from "react";
        useEffect(() => undefined, []);
      `,
      errors: [{ messageId: "rawUseEffect" }, { messageId: "rawUseEffect" }],
    },
    {
      name: "rejects React.useEffect",
      filename: webFile,
      code: `
        import React from "react";
        React.useEffect(() => undefined, []);
      `,
      errors: [{ messageId: "rawUseEffect" }],
    },
    {
      name: "rejects an aliased useEffect import",
      filename: mobileFile,
      code: `
        import { useEffect as onMount } from "react";
        onMount(() => undefined, []);
      `,
      errors: [{ messageId: "rawUseEffect" }],
    },
    {
      name: "rejects useLayoutEffect",
      filename: uiFile,
      code: `
        import { useLayoutEffect } from "react";
        useLayoutEffect(() => undefined, []);
      `,
      errors: [{ messageId: "rawUseEffect" }, { messageId: "rawUseEffect" }],
    },
    {
      name: "rejects a namespace React.useLayoutEffect",
      filename: webFile,
      code: `
        import * as React from "react";
        React.useLayoutEffect(() => undefined, []);
      `,
      errors: [{ messageId: "rawUseEffect" }],
    },
    {
      name: "rejects eslint-disable of this rule outside the hatch",
      filename: webFile,
      code: `
        /* eslint-disable futrob/no-raw-use-effect */
        import { useState } from "react";
        void useState;
      `,
      errors: [{ messageId: "disableComment" }],
    },
    {
      name: "rejects oxlint-disable-next-line of this rule",
      filename: webFile,
      code: `
        // oxlint-disable-next-line futrob/no-raw-use-effect
        const unused = 1;
        void unused;
      `,
      errors: [{ messageId: "disableComment" }],
    },
  ],
});
