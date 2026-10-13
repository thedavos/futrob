export async function recoverScheduleChangeExpiry(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/scheduling/reschedule-expiry/run`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.internalJobSecret}` },
    },
  );
  if (!response.ok) throw new Error(`Schedule change expiry recovery returned ${response.status}`);
}
