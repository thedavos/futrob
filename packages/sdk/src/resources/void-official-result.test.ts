import { expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl, parseMockJsonBody } from "../testing/mock-fetch.ts";

it("voids the encoded result with a validated reason and response", async () => {
  const result = {
    id: "result/1",
    status: "voided",
    revision: 1,
    approvalBasis: null,
    proposalId: null,
    approvedAt: "2026-10-01T00:00:00.000Z",
  };
  const client = createFutrobClient({
    baseUrl: "https://api.test/api/v1",
    fetchImpl: mockFetch((input, init) => {
      expect(requestUrl(input)).toBe("https://api.test/api/v1/official-results/result%2F1/void");
      expect(init?.method).toBe("POST");
      expect(parseMockJsonBody(init)).toEqual({ reason: "Correction" });
      return Response.json(result);
    }),
  });
  await expect(
    client.results.voidOfficialResult("result/1", { reason: " Correction " }),
  ).resolves.toEqual(result);
  await expect(client.results.voidOfficialResult("result/1", { reason: " " })).rejects.toThrow();
});
