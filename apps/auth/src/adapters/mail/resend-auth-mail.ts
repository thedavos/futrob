import type { AuthLinkEmail, AuthMailPort } from "./auth-mail.port.ts";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

interface LinkCopy {
  readonly subject: string;
  readonly body: readonly string[];
  readonly action: string;
}

const PASSWORD_RESET: LinkCopy = {
  subject: "Restablece tu contraseña de Futrob",
  body: [
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
    "El enlace vence en 1 hora y solo funciona una vez. Al usarlo se cerrarán tus sesiones abiertas.",
    "Si no lo pediste, ignora este correo: tu contraseña no cambia.",
  ],
  action: "Elegir una contraseña nueva",
};

const EMAIL_CHANGE: LinkCopy = {
  subject: "Confirma tu nuevo correo en Futrob",
  body: [
    "Pediste usar esta dirección en tu cuenta de Futrob.",
    "El cambio se aplica cuando abras el enlace. Si no lo pediste, ignora este correo.",
  ],
  action: "Confirmar correo",
};

/**
 * Account emails over Resend's HTTP API, the provider ADR-0031 chose for both runtimes.
 * Links are short-lived secrets, so they are sent at once and never stored in the product
 * outbox. Failures throw without the recipient or the link in the message.
 */
export class ResendAuthMail implements AuthMailPort {
  constructor(
    private readonly deps: {
      readonly apiKey: string;
      readonly from: string;
      readonly fetcher?: typeof fetch;
    },
  ) {}

  async sendEmailChangeVerification(input: AuthLinkEmail): Promise<void> {
    await this.send(input, EMAIL_CHANGE);
  }

  async sendPasswordReset(input: AuthLinkEmail): Promise<void> {
    await this.send(input, PASSWORD_RESET);
  }

  private async send(input: AuthLinkEmail, copy: LinkCopy): Promise<void> {
    const fetcher = this.deps.fetcher ?? fetch;
    const response = await fetcher(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.deps.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.deps.from,
        to: [input.to],
        subject: copy.subject,
        ...renderLinkEmail(input, copy),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Resend refused the account email with HTTP ${response.status}`);
    }
  }
}

interface RenderedLinkEmail {
  readonly html: string;
  readonly text: string;
}

function renderLinkEmail(input: AuthLinkEmail, copy: LinkCopy): RenderedLinkEmail {
  const greeting = `Hola, ${input.name}:`;
  const text = [
    greeting,
    "",
    ...copy.body,
    "",
    `${copy.action}: ${input.url}`,
    "",
    "-- Futrob",
  ].join("\n");
  const paragraph = (line: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px">${escapeHtml(line)}</p>`;
  const html = [
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(copy.subject)}</title></head>`,
    `<body style="margin:0;padding:24px;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1c1c1a">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">`,
    `<h1 style="margin:0 0 24px;font-size:22px;line-height:28px">${escapeHtml(copy.subject)}</h1>`,
    paragraph(greeting),
    ...copy.body.map(paragraph),
    `<p style="margin:24px 0"><a href="${escapeHtml(input.url)}" style="display:inline-block;padding:12px 20px;background:#1c1c1a;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(copy.action)}</a></p>`,
    `<p style="margin:32px 0 0;font-size:13px;color:#5c5c58">Futrob</p>`,
    `</div></body></html>`,
  ].join("");
  return { html, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
