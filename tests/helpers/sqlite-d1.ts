import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

export function createMigratedDatabase(throughMigration?: string) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const directory = new URL("../../migrations/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter(
      (name) =>
        name.endsWith(".sql") && (!throughMigration || name <= throughMigration)
    )
    .sort()) {
    sqlite.exec("BEGIN");
    try {
      sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      sqlite.close();
      throw error;
    }
  }
  return sqlite;
}

export function sqliteD1(
  sqlite: DatabaseSync,
  beforeQuery?: (query: string) => void
) {
  let batchQueue = Promise.resolve();
  const db = {
    prepare(query: string) {
      let bindings: SQLInputValue[] = [];
      const statement = sqlite.prepare(query);
      const result = {
        bind(...values: unknown[]) {
          bindings = values as SQLInputValue[];
          return result;
        },
        first: async <T>() => {
          beforeQuery?.(query);
          return (statement.get(...bindings) as T) ?? null;
        },
        all: async <T>() => {
          beforeQuery?.(query);
          return { results: statement.all(...bindings) as T[] };
        },
        run: async <T>() => {
          beforeQuery?.(query);
          return statement.run(...bindings) as T;
        },
      };
      return result;
    },
    async batch<T>(statements: { all<R>(): Promise<{ results: R[] }> }[]) {
      const previous = batchQueue;
      let release = () => {};
      batchQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.all<T>());
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      } finally {
        release();
      }
    },
  };
  return db;
}
