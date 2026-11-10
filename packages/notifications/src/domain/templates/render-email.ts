import { isCriticalEmail, type EmailIntent, type EmailLocale } from "../entities/email-intent.ts";
import { copyFor, EMAIL_COPY } from "./email-copy.ts";

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly headers: Readonly<Record<string, string>>;
}

/**
 * Renders an intent in the recipient's locale. Non-critical email carries an unsubscribe
 * link in the body and a one-click unsubscribe (RFC 8058) in its headers; critical email
 * has neither.
 */
export function renderEmail(input: {
  readonly intent: EmailIntent;
  readonly locale: EmailLocale;
  readonly recipientName: string;
  /** Web origin, such as `https://futrob.app`. */
  readonly webBaseUrl: string;
  /** Page that confirms the opt-out, linked from the body. */
  readonly unsubscribeUrl: string;
  /** Endpoint a mail client POSTs to from the `List-Unsubscribe` header (RFC 8058). */
  readonly oneClickUnsubscribeUrl: string;
}): RenderedEmail {
  const locale = EMAIL_COPY[input.locale];
  const copy = copyFor(input.intent, input.locale);
  const body = copy.body.filter((line) => line.length > 0);
  const actionUrl = `${input.webBaseUrl.replace(/\/+$/, "")}${input.intent.path}`;
  const critical = isCriticalEmail(input.intent.template);
  const footer = critical ? locale.footerCritical : locale.footerOptional;
  const greeting = locale.greeting(input.recipientName);

  const text = [
    greeting,
    "",
    ...body,
    "",
    `${copy.action}: ${actionUrl}`,
    "",
    "--",
    footer,
    ...(critical ? [] : [`${locale.unsubscribe}: ${input.unsubscribeUrl}`]),
  ].join("\n");

  const paragraph = (line: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px">${escapeHtml(line)}</p>`;
  const html = [
    `<!doctype html><html lang="${input.locale}"><head><meta charset="utf-8"><title>${escapeHtml(copy.subject)}</title></head>`,
    `<body style="margin:0;padding:24px;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1c1c1a">`,
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">`,
    `<h1 style="margin:0 0 24px;font-size:22px;line-height:28px">${escapeHtml(copy.heading)}</h1>`,
    paragraph(greeting),
    ...body.map(paragraph),
    `<p style="margin:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 20px;background:#1c1c1a;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(copy.action)}</a></p>`,
    `<p style="margin:32px 0 0;font-size:13px;line-height:20px;color:#5c5c58">${escapeHtml(footer)}`,
    critical
      ? ""
      : `<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#5c5c58">${escapeHtml(locale.unsubscribe)}</a>`,
    `</p><p style="margin:16px 0 0;font-size:13px;color:#5c5c58">${escapeHtml(locale.signature)}</p>`,
    `</div></body></html>`,
  ].join("");

  const headers: Record<string, string> = critical
    ? {}
    : {
        "List-Unsubscribe": `<${input.oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
  return { subject: copy.subject, html, text, headers };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
