import type { AuthMailPort } from "./auth-mail.port.ts";

/**
 * Development adapter: writes the confirmation link to the Worker log instead of sending it.
 * Enabled only with `AUTH_EMAIL_DELIVERY=log`; never configure it in production.
 */
export class LogAuthMail implements AuthMailPort {
  // The log line is the delivery: `warn` is the level the Worker lint allows.
  constructor(private readonly log: (line: string) => void = console.warn) {}

  async sendEmailChangeVerification(input: {
    readonly to: string;
    readonly name: string;
    readonly url: string;
  }): Promise<void> {
    this.log(JSON.stringify({ event: "auth.mail.email_change", to: input.to, url: input.url }));
  }
}
