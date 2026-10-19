import { useState } from "react";
import { authClient } from "./auth-client";

interface Props {
  email: string;
}

export default function Login({ email }: Props) {
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.email({ email: emailValue, password });
    if (result?.error) {
      setError(result.error.message ?? "Identifiants incorrects.");
      setBusy(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void signIn();
      }}
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          data-testid="email"
          type="email"
          autoComplete="username"
          value={emailValue}
          onChange={(event) => setEmailValue(event.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
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
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p data-testid="error" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-testid="password-signin"
        disabled={busy || password.length === 0}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Se connecter
      </button>
    </form>
  );
}
