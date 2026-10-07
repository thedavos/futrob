export async function recoverCandidateRecalculation(deps: {
  readonly fetcher: typeof fetch;
  readonly apiBaseUrl: string;
  readonly internalJobSecret: string;
}): Promise<void> {
  const response = await deps.fetcher(
    `${deps.apiBaseUrl.replace(/\/$/, "")}/internal/results/candidate-recalculation/run`,
    { method: "POST", headers: { Authorization: `Bearer ${deps.internalJobSecret}` } },
  );
  if (!response.ok) throw new Error(`Candidate recalculation returned ${response.status}`);
}
