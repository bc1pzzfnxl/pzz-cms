/**
 * Minimal structural interface over a Cloudflare R2 bucket. The app depends on
 * this, not on the concrete `R2Bucket` type, so it can be driven by a real R2
 * binding and faked in tests.
 */
export interface R2ObjectLike {
  body: ReadableStream;
  size: number;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
}

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}
