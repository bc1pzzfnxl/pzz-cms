import { useState } from "react";
import { authClient } from "./auth-client";

interface Props {
  token: string;
  email: string;
}

export default function Setup({ token, email }: Props) {
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/admin/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email: emailValue, password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Échec de la création du compte.");
        setBusy(false);
        return;
      }

      const signIn = await authClient.signIn.email({ email: emailValue, password });
      if (signIn?.error) {
        setError("Compte créé. Va sur /admin/login pour te connecter.");
        setBusy(false);
        return;
      }
      window.location.href = "/admin";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border px-3 py-2 text-sm";

  return (
    <form
      className="max-w-sm space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          data-testid="setup-email"
          type="email"
          autoComplete="username"
          value={emailValue}
          onChange={(event) => setEmailValue(event.target.value)}
          className={input}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          data-testid="setup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={input}
        />
        <p className="mt-1 text-xs text-muted-foreground">12 caractères minimum.</p>
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="confirm">
          Confirmation
        </label>
        <input
          id="confirm"
          data-testid="setup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={input}
        />
      </div>

      {error && (
        <p data-testid="setup-error" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-testid="setup-submit"
        disabled={busy || password.length < 12 || confirm.length === 0}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Créer le compte
      </button>
    </form>
  );
}
