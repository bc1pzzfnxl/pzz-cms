import type { Database as Sqlite } from "bun:sqlite";
import type { Database, PreparedStatement } from "@/content/types";

/**
 * Adapt a Bun SQLite database to the `Database` interface the content module
 * expects. This lets the module be tested with a real SQLite engine, in memory,
 * without the workerd runtime.
 */
export function createBunDatabase(sqlite: Sqlite): Database {
  return {
    prepare(query: string): PreparedStatement {
      const statement = sqlite.query(query);
      let values: unknown[] = [];

      const api: PreparedStatement = {
        bind(...next) {
          values = next;
          return api;
        },
        async all<T>() {
          return { results: statement.all(...(values as never[])) as T[] };
        },
        async first<T>() {
          return (statement.get(...(values as never[])) as T | undefined) ?? null;
        },
        async run() {
          statement.run(...(values as never[]));
          return {};
        },
      };

      return api;
    },
  };
}
