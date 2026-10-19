import { authClient } from "./auth-client";

export default function Logout() {
  async function signOut() {
    await authClient.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <button
      type="button"
      data-testid="logout"
      onClick={() => void signOut()}
      className="text-sm text-muted-foreground hover:underline"
    >
      Déconnexion
    </button>
  );
}
