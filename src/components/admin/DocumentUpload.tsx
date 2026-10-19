import { useState } from "react";

export default function DocumentUpload() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      JSON.parse(text); // local validation, the server checks again

      const response = await fetch("/admin/api/documents/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, bodyJson: text }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Échec de l'import.");
        setBusy(false);
        return;
      }
      const data = (await response.json()) as { id: string };
      window.location.href = `/admin/documents/${data.id}`;
    } catch (cause) {
      setError(`JSON invalide : ${cause instanceof Error ? cause.message : String(cause)}`);
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <label className="inline-block cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Importer un .json
        <input
          type="file"
          accept=".json,application/json"
          data-testid="document-upload"
          disabled={busy}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {error && (
        <p data-testid="document-upload-error" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
