import { convertToWebp, convertToWebpVariants, MEDIA_VARIANT_WIDTHS } from "@pzz-cms/core";
import { useState } from "react";

/**
 * Standalone media upload: converts to WebP in the browser, generates the
 * width variants and posts everything to the existing media endpoint.
 */
export default function MediaUpload() {
  const [busy, setBusy] = useState(false);
  const [alt, setAlt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const { blob, width, height } = await convertToWebp(file);
      const variants = await convertToWebpVariants(
        file,
        MEDIA_VARIANT_WIDTHS.filter((variantWidth) => variantWidth < width),
        0.85,
      );
      const form = new FormData();
      const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
      form.append("file", new File([blob], name, { type: "image/webp" }));
      for (const variant of variants) {
        form.append(
          `variant-${variant.width}`,
          new File([variant.blob], `${name.replace(/\.webp$/, "")}-${variant.width}.webp`, {
            type: "image/webp",
          }),
        );
      }
      form.append("width", String(width));
      form.append("height", String(height));
      form.append("alt", alt.trim());

      const res = await fetch("/admin/api/media/", { method: "POST", body: form });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Échec de l'envoi de l'image.");
      }
      setMessage("Image envoyée.");
      window.location.reload();
    } catch (error) {
      setMessage(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <label className="field-label" htmlFor="media-alt">
        Texte alternatif (optionnel, modifiable plus tard)
      </label>
      <input
        id="media-alt"
        className="input mb-3 max-w-md"
        value={alt}
        placeholder="Décrivez l'image : sujet, source, date"
        onChange={(event) => setAlt(event.target.value)}
      />
      <label className={`dropzone block ${busy ? "opacity-60" : ""}`}>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {busy
          ? "Envoi en cours…"
          : "Glisser une image ou cliquer — convertie en WebP dans le navigateur"}
      </label>
      {message && <p className="mt-2 text-[13px] text-muted-foreground">{message}</p>}
    </div>
  );
}
