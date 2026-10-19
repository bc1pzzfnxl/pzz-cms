import { useState } from "react";
import { authClient } from "./auth-client";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (next !== confirm) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (next.length < 12) {
      setError("Le nouveau mot de passe doit faire au moins 12 caractères.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: false,
    });

    if (result?.error) {
      setError(result.error.message ?? "Échec du changement de mot de passe.");
      setBusy(false);
      return;
    }

    setMessage("Mot de passe mis à jour.");
    setCurrent("");
    setNext("");
    setConfirm("");
    setBusy(false);
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
        <label className="block text-sm font-medium" htmlFor="current">
          Mot de passe actuel
        </label>
        <input
          id="current"
          data-testid="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={input}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="next">
          Nouveau mot de passe
        </label>
        <input
          id="next"
          data-testid="new-password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          className={input}
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="confirm">
          Confirmation
        </label>
        <input
          id="confirm"
          data-testid="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={input}
        />
      </div>

      {error && (
        <p data-testid="password-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p data-testid="password-success" className="text-sm text-green-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        data-testid="change-password"
        disabled={busy || current.length === 0 || next.length < 12}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Changer le mot de passe
      </button>
    </form>
  );
}
