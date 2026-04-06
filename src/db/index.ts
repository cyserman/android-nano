import { createDatabase } from "@kilocode/app-builder-db";
import * as schema from "./schema";

// Lazy singleton — deferred until first use so the build doesn't require
// DB_URL / DB_TOKEN to be present at compile time.
let _db: ReturnType<typeof createDatabase<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDatabase(schema);
  }
  return _db;
}

// Proxy that forwards every property access to the lazy instance,
// keeping the rest of the codebase unchanged (import { db } still works).
export const db = new Proxy({} as ReturnType<typeof createDatabase<typeof schema>>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof createDatabase<typeof schema>>];
  },
});
