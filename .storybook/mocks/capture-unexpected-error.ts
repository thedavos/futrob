/**
 * Storybook stub — the real module is a `createIsomorphicFn` whose
 * `@tanstack/react-start` import pulls `node:async_hooks`, and Storybook's Vite
 * does not run the Start compiler that strips it. Stories always run in the
 * browser, so bind the client branch directly.
 */
export { captureBrowserError as captureUnexpectedError } from "../../apps/web/src/observability/sentry-browser.ts";
