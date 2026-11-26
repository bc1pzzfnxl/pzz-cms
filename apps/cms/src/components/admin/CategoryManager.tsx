import { useState } from "react";
import { toApiError } from "../../lib/client";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
};

interface Props {
  initial: Category[];
}

const inputClass = "input";

const toast = (message: string, kind: "success" | "danger" = "success") =>
  (window as Window & { toast?: (message: string, kind?: string) => void }).toast?.(message, kind);

export default function CategoryManager({ initial }: Props) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameIssue, setNameIssue] = useState<string | null>(null);
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
    setNameIssue(null);
    try {
      const res = await fetch("/admin/api/categories/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) {
        const error = await toApiError(res);
        setNameIssue(error.issueFor("name") ?? null);
        setMessage(error.message);
        return;
      }
      setName("");
      setDescription("");
      toast("Category created.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function update(
    id: string,
    payload: { name?: string; description?: string | null; position?: number },
  ) {
    const res = await fetch(`/admin/api/categories/${id}/`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await toApiError(res);
      setMessage(error.message);
    } else {
      toast("Category saved.");
    }
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category? Its articles become uncategorized.")) {
      return;
    }
    const res = await fetch(`/admin/api/categories/${id}/`, { method: "DELETE" });
    if (!res.ok) {
      const error = await toApiError(res);
      setMessage(error.message);
    } else {
      toast("Category deleted.");
    }
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
    <div className="space-y-4">
      <form
        className="card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <div className="text-[15px] font-medium">New category</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="category-name">
              Name
            </label>
            <input
              id="category-name"
              data-testid="category-name"
              className={inputClass}
              value={name}
              placeholder="Theology"
              aria-invalid={nameIssue ? true : undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {nameIssue && <p className="mt-1 text-xs text-destructive">{nameIssue}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="category-description">
              Description (optional)
            </label>
            <input
              id="category-description"
              aria-label="New category description"
              className={inputClass}
              value={description}
              placeholder="Shown on the category page"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          data-testid="category-create"
          disabled={busy}
          className="btn btn-primary mt-3"
        >
          Add
        </button>
      </form>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="card overflow-hidden">
        {categories.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 border-b px-4 py-2.5 text-[13px] font-medium text-muted-foreground">
              <span className="w-[52px]">Order</span>
              <span className="flex-1">Name and description</span>
              <span className="w-20" />
            </div>
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex w-[52px] flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="btn btn-ghost btn-sm h-6 px-1.5 text-xs disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="btn btn-ghost btn-sm h-6 px-1.5 text-xs disabled:opacity-30"
                    disabled={index === categories.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    ↓
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      aria-label={`Name of ${category.name}`}
                      className={inputClass}
                      defaultValue={category.name}
                      onBlur={(event) => {
                        const value = event.target.value.trim();
                        if (value && value !== category.name)
                          void update(category.id, { name: value });
                      }}
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      /{category.slug}/
                    </span>
                  </div>
                  <input
                    aria-label={`Description of ${category.name}`}
                    className={inputClass}
                    defaultValue={category.description ?? ""}
                    placeholder="Description shown on /categorie/…"
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value !== (category.description ?? "")) {
                        void update(category.id, { description: value || null });
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-destructive"
                  onClick={() => void remove(category.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No categories.</p>
        )}
      </div>
    </div>
  );
}
