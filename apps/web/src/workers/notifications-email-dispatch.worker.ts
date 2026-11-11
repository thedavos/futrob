/**
 * Wakes the API's email outbox runner (ADR-0031). The API answers 503 while no provider is
 * configured: queued email waits as pending, so that is not a Cron failure.
 */
export async function dispatchDueEmails(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/notifications/email-dispatch/run`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.internalJobSecret}` },
    },
  );
  if (response.status === 503) return;
  if (!response.ok) throw new Error(`Email dispatch returned ${response.status}`);
}
