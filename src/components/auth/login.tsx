import { useState } from "react";
import { authClient } from "./auth-client";

interface Props {
  email: string;
}

export default function Login({ email }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");

  async function signInWithPasskey() {
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

  async function signInWithPassword() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    if (result?.error) {
      setError(result.error.message ?? "Mot de passe incorrect.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <button
          type="button"
          data-testid="passkey-signin"
          disabled={busy}
          onClick={() => void signInWithPasskey()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Se connecter avec une passkey
        </button>
        <p className="text-xs text-muted-foreground">
          Nécessite Windows Hello, Touch ID ou votre téléphone.
        </p>
      </div>

      <form
        className="space-y-3 border-t pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void signInWithPassword();
        }}
      >
        <label className="block text-sm font-medium" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          data-testid="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          data-testid="password-signin"
          disabled={busy || password.length === 0}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          Se connecter avec le mot de passe
        </button>
        <p className="text-xs text-muted-foreground">
          Repli si votre machine ne gère pas les passkeys.
        </p>
      </form>

      {error && (
        <p data-testid="error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
