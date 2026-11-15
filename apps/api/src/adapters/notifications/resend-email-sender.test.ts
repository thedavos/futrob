import { describe, expect, it } from "vite-plus/test";
import { ResendEmailSender } from "./resend-email-sender.ts";

const MESSAGE = {
  to: "ana@example.test",
  subject: "Hola",
  html: "<p>Hola</p>",
  text: "Hola",
  headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", "List-Unsubscribe": "<u>" },
  idempotencyKey: "email-delivery/d-1",
};

function senderAnswering(response: Response) {
  const bodies: string[] = [];
  const sender = new ResendEmailSender({
    fetcher: (async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return response.clone();
    }) as typeof fetch,
    apiKey: "re_test",
    from: "Futrob <avisos@futrob.test>",
    timeoutMs: 1_000,
  });
  return { sender, bodies };
}

describe("ResendEmailSender", () => {
  it("retries a 409 for a concurrent request with the key, and ends one for another body", async () => {
    const concurrent = senderAnswering(
      Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 }),
    );
    const busy = await concurrent.sender.send(MESSAGE);
    expect(busy.isErr() && busy.error).toMatchObject({
      retryable: true,
      message: "Resend refused the email with HTTP 409 concurrent_idempotent_requests",
    });

    const invalid = senderAnswering(
      Response.json({ name: "invalid_idempotent_request" }, { status: 409 }),
    );
    const conflict = await invalid.sender.send(MESSAGE);
    expect(conflict.isErr() && conflict.error).toMatchObject({
      retryable: false,
      message: "Resend refused the email with HTTP 409 invalid_idempotent_request",
    });
  });

  it("serializes the same body whatever order the headers come in", async () => {
    const { sender, bodies } = senderAnswering(Response.json({ id: "re_1" }));
    await sender.send(MESSAGE);
    await sender.send({
      ...MESSAGE,
      headers: {
        "List-Unsubscribe": "<u>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    expect(bodies[0]).toBe(bodies[1]);
  });
});
