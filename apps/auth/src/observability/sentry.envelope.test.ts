import { afterEach, describe, expect, it } from "vite-plus/test";
import * as Sentry from "@sentry/node";
import {
  applySentryEventPolicy,
  applySentryTransactionPolicy,
  scrubSentryEnvelope,
  sentrySdkOptions,
} from "@futrob/logger";

const INVITE_TOKEN = "SYNTHETIC_INVITE_TOKEN";
const invitePath = `/roster-invitations/accept/${INVITE_TOKEN}`;

function memoryClient() {
  const envelopes: string[] = [];
  const shared = sentrySdkOptions({
    dsn: "https://public@sentry.invalid/1",
    nodeEnv: "production",
    service: "auth",
  });
  expect(shared).toBeTruthy();
  if (!shared) return { client: undefined, envelopes };
  const client = new Sentry.NodeClient({
    dsn: shared.dsn,
    environment: shared.environment,
    tracesSampleRate: 1,
    dataCollection: shared.dataCollection,
    traceLifecycle: shared.traceLifecycle,
    integrations: [],
    beforeSend: (event, hint) => applySentryEventPolicy(event, hint),
    beforeSendTransaction: (event) => applySentryTransactionPolicy(event),
    stackParser: () => [],
    transport: (options) =>
      Sentry.createTransport(options, async (request) => {
        envelopes.push(String(request.body));
        return { statusCode: 200 };
      }),
  });
  client.init();
  client.on("beforeEnvelope", scrubSentryEnvelope);
  Sentry.setCurrentClient(client);
  return { client, envelopes };
}

afterEach(async () => {
  await Sentry.flush();
  const client = Sentry.getClient();
  await client?.close();
  Sentry.getCurrentScope().setClient(undefined);
});

describe("Sentry v11 transaction envelopes", () => {
  it("scrubs invite tokens from transaction envelopes under static lifecycle", async () => {
    const { client, envelopes } = memoryClient();
    expect(client).toBeTruthy();
    if (!client) return;
    await Sentry.startSpan(
      {
        name: `GET ${invitePath}`,
        op: "http.server",
        attributes: { "url.full": `https://app.futrob.app${invitePath}` },
      },
      () => undefined,
    );
    await client.flush();
    const payload = envelopes.join("\n");
    expect(payload.length).toBeGreaterThan(0);
    expect(payload).not.toContain(INVITE_TOKEN);
    expect(payload).toContain("[Filtered]");
  });
});
