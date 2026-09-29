import { describe, expect, it } from "vite-plus/test";
import {
  detectImageType,
  MAX_COVER_BYTES,
  readCompetitionCoverBytes,
  readMedia,
  storeCompetitionCover,
  type MediaBucket,
} from "./competition-cover-storage.ts";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];

class MemoryBucket implements MediaBucket {
  readonly objects = new Map<string, { bytes: ArrayBuffer; contentType: string }>();
  async put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }) {
    this.objects.set(key, { bytes: value, contentType: options.httpMetadata.contentType });
    return null;
  }
  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new Response(object.bytes).body!,
      httpMetadata: { contentType: object.contentType },
    };
  }
}

const bytes = (values: number[]) => new Uint8Array(values).buffer;

describe("competition cover storage", () => {
  it("detects PNG, JPEG and WebP by signature and rejects anything else", () => {
    expect([PNG, JPEG, WEBP, GIF].map((file) => detectImageType(new Uint8Array(file)))).toEqual([
      "png",
      "jpeg",
      "webp",
      null,
    ]);
  });

  it("stores a PNG under the organization prefix and serves it back cached", async () => {
    const bucket = new MemoryBucket();
    const stored = await storeCompetitionCover({
      bucket,
      organizationId: "org-1",
      creationKey: "ck-1",
      bytes: bytes(PNG),
    });
    expect(stored).toEqual({ ok: true, key: "competition-covers/org-1/ck-1.png" });

    const response = await readMedia(bucket, "competition-covers/org-1/ck-1.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(PNG);
    expect((await readMedia(bucket, "competition-covers/org-1/missing.png")).status).toBe(404);
  });

  it("overwrites the same object when the upload is retried", async () => {
    const bucket = new MemoryBucket();
    const upload = () =>
      storeCompetitionCover({
        bucket,
        organizationId: "org-1",
        creationKey: "ck-1",
        bytes: bytes(JPEG),
      });
    await upload();
    await upload();
    expect([...bucket.objects.keys()]).toEqual(["competition-covers/org-1/ck-1.jpg"]);
  });

  it("rejects non-images, oversized files and unsafe names without writing", async () => {
    const bucket = new MemoryBucket();
    const results = await Promise.all([
      storeCompetitionCover({
        bucket,
        organizationId: "org-1",
        creationKey: "ck-1",
        bytes: bytes(GIF),
      }),
      storeCompetitionCover({
        bucket,
        organizationId: "org-1",
        creationKey: "ck-2",
        bytes: new Uint8Array([...PNG, ...new Array(2 * 1024 * 1024).fill(0)]).buffer,
      }),
      storeCompetitionCover({
        bucket,
        organizationId: "org-1",
        creationKey: "../escape",
        bytes: bytes(PNG),
      }),
    ]);
    expect(results).toEqual([
      { ok: false, status: 415, code: "media.unsupported_type" },
      { ok: false, status: 413, code: "media.too_large" },
      { ok: false, status: 400, code: "media.invalid_name" },
    ]);
    expect(bucket.objects.size).toBe(0);
  });
});

describe("bounded cover body reader", () => {
  it("reads an upload at the byte limit", async () => {
    const body = new Uint8Array(MAX_COVER_BYTES);
    body.set(PNG);
    const result = await readCompetitionCoverBytes(
      new Request("https://futrob.test/upload", { method: "PUT", body }),
    );
    expect(result?.byteLength).toBe(MAX_COVER_BYTES);
    expect([...new Uint8Array(result!).slice(0, PNG.length)]).toEqual(PNG);
  });

  it.each([undefined, "1"])(
    "rejects an oversized body with Content-Length %s",
    async (contentLength) => {
      const request = new Request("https://futrob.test/upload", {
        method: "PUT",
        body: new Uint8Array(MAX_COVER_BYTES + 1),
        headers: contentLength ? { "content-length": contentLength } : {},
      });
      await expect(readCompetitionCoverBytes(request)).resolves.toBeNull();
    },
  );
});
