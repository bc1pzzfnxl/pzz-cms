/**
 * Slug rules (see GLOSSARY.md): ASCII, kebab-case, accents removed. Titles keep
 * their accents; slugs never do, to avoid percent-encoding and index
 * fragmentation.
 */

/** Turn any title into an ASCII kebab-case slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Return a slug that is not already taken, appending `-2`, `-3`, … when needed.
 * `taken` is the set of slugs already in use.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "article";
  if (!used.has(root)) return root;

  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
