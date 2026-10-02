/** Subset of the Workers `R2Bucket` API the image flows use. */
export interface MediaBucket {
  put(
    key: string,
    value: ArrayBuffer,
    options: { readonly httpMetadata: { readonly contentType: string } },
  ): Promise<object | null>;
  get(key: string): Promise<{
    readonly body: ReadableStream;
    readonly httpMetadata?: { readonly contentType?: string };
  } | null>;
}

export type ImageType = "png" | "jpeg" | "webp";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const IMAGE_FORMATS = {
  png: { ext: "png", contentType: "image/png" },
  jpeg: { ext: "jpg", contentType: "image/jpeg" },
  webp: { ext: "webp", contentType: "image/webp" },
} as const satisfies Record<ImageType, { readonly ext: string; readonly contentType: string }>;

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/** Sniffs the file signature; the client `Content-Type` is never trusted. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "webp";
  return null;
}

export type StoreImageResult =
  | { readonly ok: true; readonly key: string }
  | {
      readonly ok: false;
      readonly status: 400 | 413 | 415;
      readonly code: "media.invalid_name" | "media.too_large" | "media.unsupported_type";
    };

const SAFE_NAME = /^[A-Za-z0-9_-]{1,120}$/;

/**
 * Writes `{prefix}/{organizationId}/{name}.{ext}`. The name comes from the caller's retry key,
 * so a retried upload overwrites the same object instead of leaving a duplicate.
 */
async function storeImage(input: {
  readonly bucket: MediaBucket;
  readonly prefix: "competition-covers" | "organization-logos";
  readonly organizationId: string;
  readonly name: string;
  readonly bytes: ArrayBuffer;
}): Promise<StoreImageResult> {
  if (!SAFE_NAME.test(input.name) || !SAFE_NAME.test(input.organizationId)) {
    return { ok: false, status: 400, code: "media.invalid_name" };
  }
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, code: "media.too_large" };
  }
  const type = detectImageType(
    new Uint8Array(input.bytes, 0, Math.min(12, input.bytes.byteLength)),
  );
  if (!type) return { ok: false, status: 415, code: "media.unsupported_type" };
  const format = IMAGE_FORMATS[type];
  const key = `${input.prefix}/${input.organizationId}/${input.name}.${format.ext}`;
  await input.bucket.put(key, input.bytes, { httpMetadata: { contentType: format.contentType } });
  return { ok: true, key };
}

/** Stores `competition-covers/{organizationId}/{creationKey}.{ext}`. */
export function storeCompetitionCover(input: {
  readonly bucket: MediaBucket;
  readonly organizationId: string;
  readonly creationKey: string;
  readonly bytes: ArrayBuffer;
}): Promise<StoreImageResult> {
  return storeImage({
    bucket: input.bucket,
    prefix: "competition-covers",
    organizationId: input.organizationId,
    name: input.creationKey,
    bytes: input.bytes,
  });
}

/** Stores `organization-logos/{organizationId}/{uploadKey}.{ext}`. */
export function storeOrganizationLogo(input: {
  readonly bucket: MediaBucket;
  readonly organizationId: string;
  readonly uploadKey: string;
  readonly bytes: ArrayBuffer;
}): Promise<StoreImageResult> {
  return storeImage({
    bucket: input.bucket,
    prefix: "organization-logos",
    organizationId: input.organizationId,
    name: input.uploadKey,
    bytes: input.bytes,
  });
}

/** Streams a stored image. Keys never change content, so the response is cached forever. */
export async function readMedia(bucket: MediaBucket, key: string): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Bounds uploads even when Content-Length is absent or understated. */
export async function readImageBytes(request: Request): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
