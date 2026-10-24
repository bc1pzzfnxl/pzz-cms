/**
 * Browser-side image conversion. Cloudflare Workers cannot run image tooling,
 * so the admin converts uploads to WebP on a canvas before sending them.
 * See ADR 0005 and PLAN.md, phase P5.
 */
export interface ConvertedImage {
  blob: Blob;
  width: number;
  height: number;
}

export type WebpVariant = ConvertedImage;

export async function convertToWebp(
  file: File,
  maxWidth = 1600,
  quality = 0.85,
): Promise<ConvertedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible dans ce navigateur.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("Conversion WebP impossible dans ce navigateur.");

  return { blob, width, height };
}

/**
 * Smaller WebP variants of the same source, at the given max widths. Used for
 * `srcset`: the original stays untouched and keeps its full quality.
 */
export async function convertToWebpVariants(
  file: File,
  widths: readonly number[],
  quality = 0.85,
): Promise<WebpVariant[]> {
  if (widths.length === 0) return [];

  const bitmap = await createImageBitmap(file);
  const variants: WebpVariant[] = [];

  for (const maxWidth of widths) {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      throw new Error("Canvas indisponible dans ce navigateur.");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob) variants.push({ blob, width, height });
  }

  bitmap.close?.();
  return variants;
}
