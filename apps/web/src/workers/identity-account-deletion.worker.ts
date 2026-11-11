/** Wakes the product API to anonymize accounts whose deletion grace period ended (ADR-0029). */
export async function runDueAccountDeletions(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/identity/account-deletion/run`,
    { method: "POST", headers: { Authorization: `Bearer ${deps.internalJobSecret}` } },
  );
  if (!response.ok) throw new Error(`Account deletion run returned ${response.status}`);
}
