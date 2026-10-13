import { useState } from "react";
import { authClient } from "./auth-client";

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      setError(result.error.message ?? "Échec de la connexion.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        data-testid="passkey-signin"
        disabled={busy}
        onClick={() => void signIn()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Se connecter avec une passkey
      </button>
      {error && (
        <p data-testid="error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
