import { createIsomorphicFn } from "@tanstack/react-start";
import { captureBrowserError } from "./sentry-browser.ts";
import { captureWorkerError } from "./sentry.ts";

/**
 * Reports a defect with the Sentry SDK of the current runtime: the Worker SDK
 * during SSR, the browser SDK after hydration. The Start compiler drops the
 * other branch (and its SDK) from each bundle.
 */
export const captureUnexpectedError = createIsomorphicFn()
  .server(captureWorkerError)
  .client(captureBrowserError);
