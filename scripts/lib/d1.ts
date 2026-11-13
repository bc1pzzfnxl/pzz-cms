/**
 * Run a SQL statement against the remote D1 database through
 * `bunx wrangler d1 execute`, using a Wrangler config that carries the real
 * database id (gitignored in deployments). Returns the rows of the first
 * statement result; throws on failure.
 */
export function d1Query<T>(sql: string, config: string): T[] {
  const result = Bun.spawnSync(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--json",
      "--command",
      sql,
    ],
    { stdout: "pipe", stderr: "inherit" },
  );

  if (result.exitCode !== 0) {
    throw new Error(`D1 query failed: ${sql}`);
  }

  const text = result.stdout.toString();
  const start = text.indexOf("[");
  if (start === -1) throw new Error(`Unexpected D1 output: ${text.slice(0, 200)}`);
  return (JSON.parse(text.slice(start))[0].results ?? []) as T[];
}
