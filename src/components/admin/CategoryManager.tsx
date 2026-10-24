import { useState } from "react";

type Category = { id: string; slug: string; name: string; position: number };

interface Props {
  initial: Category[];
}

const inputClass = "w-full rounded-md border px-3 py-2 text-sm";

export default function CategoryManager({ initial }: Props) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/admin/api/categories/");
    if (res.ok) setCategories((await res.json()) as Category[]);
  }

  async function create() {
    if (!name.trim() || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/admin/api/categories/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? "Erreur à la création.");
        return;
      }
      setName("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, payload: { name?: string; position?: number }) {
    const res = await fetch(`/admin/api/categories/${id}/`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) setMessage("Erreur à l'enregistrement.");
    await refresh();
  }

  async function remove(id: string) {
    if (
      !window.confirm("Supprimer cette catégorie ? Les articles repasseront en « sans catégorie ».")
    ) {
      return;
    }
    const res = await fetch(`/admin/api/categories/${id}/`, { method: "DELETE" });
    if (!res.ok) setMessage("Erreur à la suppression.");
    await refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= categories.length) return;

    const current = categories[index];
    const neighbour = categories[other];
    await update(current.id, { position: neighbour.position });
    await update(neighbour.id, { position: current.position });
  }

  return (
    <div className="space-y-8">
      <form
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="category-name">
            Nouvelle catégorie
          </label>
          <input
            id="category-name"
            data-testid="category-name"
            className={`${inputClass} mt-1`}
            value={name}
            placeholder="Théologie"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <button
          type="submit"
          data-testid="category-create"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {categories.length > 0 ? (
        <ul className="space-y-2">
          {categories.map((category, index) => (
            <li key={category.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Monter"
                  className="text-xs disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Descendre"
                  className="text-xs disabled:opacity-30"
                  disabled={index === categories.length - 1}
                  onClick={() => void move(index, 1)}
                >
                  ↓
                </button>
              </div>
              <div className="flex-1">
                <input
                  className={inputClass}
                  defaultValue={category.name}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value && value !== category.name) void update(category.id, { name: value });
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">{category.slug}</p>
              </div>
              <button
                type="button"
                className="text-sm text-destructive hover:underline"
                onClick={() => void remove(category.id)}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune catégorie.</p>
      )}
    </div>
  );
}
