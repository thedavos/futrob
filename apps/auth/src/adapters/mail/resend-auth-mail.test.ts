import { describe, expect, it } from "vite-plus/test";
import { RESEND_EMAILS_URL, ResendAuthMail } from "./resend-auth-mail.ts";

describe("ResendAuthMail", () => {
  it("sends the reset link to the account owner with escaped HTML", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const mail = new ResendAuthMail({
      apiKey: "re_synthetic",
      from: "Futrob <cuenta@futrob.app>",
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init: init! });
        return Response.json({ id: "email-1" });
      },
    });

    await mail.sendPasswordReset({
      to: "ana@example.test",
      name: "Ana <b>",
      url: "https://futrob.app/api/auth/reset-password/tok?callbackURL=%2Freset-password",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe(RESEND_EMAILS_URL);
    const body = JSON.parse(String(requests[0]!.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: "Futrob <cuenta@futrob.app>",
      to: ["ana@example.test"],
      subject: "Restablece tu contraseña de Futrob",
    });
    expect(body.text).toContain("callbackURL=%2Freset-password");
    expect(body.html).toContain("Ana &lt;b&gt;");
  });

  it("sends the account verification link with its own subject", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const mail = new ResendAuthMail({
      apiKey: "re_synthetic",
      from: "Futrob <cuenta@futrob.app>",
      fetcher: async (_url, init) => {
        bodies.push(JSON.parse(String(init!.body)) as Record<string, unknown>);
        return Response.json({ id: "email-2" });
      },
    });

    await mail.sendEmailVerification({
      to: "ana@example.test",
      name: "Ana",
      url: "https://futrob.app/api/auth/verify-email?token=tok&callbackURL=%2Fverify-email",
    });

    expect(bodies[0]).toMatchObject({
      to: ["ana@example.test"],
      subject: "Confirma tu correo en Futrob",
    });
    expect(bodies[0]!.text).toContain("callbackURL=%2Fverify-email");
  });

  it("fails without the recipient or the link in the error", async () => {
    const mail = new ResendAuthMail({
      apiKey: "re_synthetic",
      from: "Futrob <cuenta@futrob.app>",
      fetcher: async () => new Response(null, { status: 422 }),
    });
    const sending = mail.sendPasswordReset({
      to: "ana@example.test",
      name: "Ana",
      url: "https://futrob.app/secret-token",
    });
    await expect(sending).rejects.toThrow("HTTP 422");
    await expect(sending).rejects.not.toThrow(/ana@example|secret-token/);
  });
});
