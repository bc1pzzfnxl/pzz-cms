import { useState } from "react";
import { authClient } from "./auth-client";

interface Props {
  token: string;
}

export default function Setup({ token }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    setError(null);
    const result = await authClient.passkey.addPasskey({
      name: "Admin",
      context: token,
      createSession: true,
    });
    if (result?.error) {
      setError(result.error.message ?? "Échec de l'enregistrement.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        data-testid="passkey-register"
        disabled={busy}
        onClick={() => void register()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Enregistrer ma passkey
      </button>
      {error && (
        <p data-testid="error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
