export async function recoverConfirmationExpiry(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/results/confirmation-expiry/run`,
    { method: "POST", headers: { Authorization: `Bearer ${deps.internalJobSecret}` } },
  );
  if (!response.ok) throw new Error(`Confirmation expiry recovery returned ${response.status}`);
}
