import type { AuthLinkEmail, AuthMailPort } from "./auth-mail.port.ts";

/**
 * Development adapter: writes the link to the Worker log instead of sending it.
 * Enabled only with `AUTH_EMAIL_DELIVERY=log`; never configure it in production.
 */
export class LogAuthMail implements AuthMailPort {
  // The log line is the delivery: `warn` is the level the Worker lint allows.
  constructor(private readonly log: (line: string) => void = console.warn) {}

  async sendEmailChangeVerification(input: AuthLinkEmail): Promise<void> {
    this.write("auth.mail.email_change", input);
  }

  async sendPasswordReset(input: AuthLinkEmail): Promise<void> {
    this.write("auth.mail.password_reset", input);
  }

  private write(event: string, input: AuthLinkEmail): void {
    this.log(JSON.stringify({ event, to: input.to, url: input.url }));
  }
}
