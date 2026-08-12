export type RateLimitSubjectKind = "actor" | "ip";

export async function fingerprintRateLimitSubject(
  secret: string,
  subjectKind: RateLimitSubjectKind,
  subject: string,
): Promise<string> {
  if (!secret) throw new Error("Rate-limit fingerprint secret is required");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${subjectKind}:${subject}`),
  );
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
