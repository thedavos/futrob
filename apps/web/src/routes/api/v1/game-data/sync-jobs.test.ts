import { describe, expect, it } from "vite-plus/test";
import { handleProviderSyncJobRequest } from "./sync-jobs.handler.ts";

const requestId = "032141c9-0574-4129-86d4-7192bdbbcadd";

describe("provider sync job BFF", () => {
  it.each([
    ["org-owned", true, 202, 1],
    ["org-other", false, 403, 0],
  ] as const)(
    "enforces organization membership before publishing work for %s",
    async (organizationId, allowed, expectedStatus, expectedMessages) => {
      let messages = 0;
      let enqueues = 0;
      const send = async () => void (messages += 1);
      const enqueue = async () => {
        enqueues += 1;
        return {
          id: "job-1",
          organizationId,
          providerKey: "ea-clubs" as const,
          status: "queued" as const,
          attempt: 0,
          maxAttempts: 4,
          requestId,
          availableAt: "2026-08-11T20:00:00.000Z",
          leaseExpiresAt: null,
          updatedAt: "2026-08-11T20:00:00.000Z",
        };
      };
      const response = await handleProviderSyncJobRequest(
        new Request("https://app.futrob.test/api/v1/game-data/sync-jobs", {
          method: "POST",
          body: JSON.stringify({
            organizationId,
            providerKey: "ea-clubs",
            externalClubId: "10754",
            platform: "common-gen5",
            gameEdition: "fc26",
            matchType: "friendlyMatch",
            maxResultCount: 10,
          }),
        }),
        {
          authenticate: async () => ({
            requestId,
            client: {
              authorization: {
                getEffectiveAccess: async () => ({
                  actorId: "actor-1",
                  scope: { organizationId },
                  roles: [],
                  permissions: [
                    { permission: "organizations.read", allowed, decidedAt: "organization" },
                  ],
                }),
              },
              gameData: { syncJobs: { enqueue } },
            },
          }),
          getQueue: () => ({ send }),
        },
      );

      expect(response.status).toBe(expectedStatus);
      expect(enqueues).toBe(expectedMessages);
      expect(messages).toBe(expectedMessages);
    },
  );
});
