import { invoke } from "@tauri-apps/api/core";
import { createDatabase, type SqlResult } from "@remedia/core";

/**
 * The app's database. Queries are typed Drizzle queries from @remedia/core;
 * Rust (src-tauri/src/db.rs) only executes the SQL they produce.
 */
export const db = createDatabase(
  (query) => invoke<SqlResult>("db_execute", { query }),
  (queries) => invoke<SqlResult[]>("db_batch", { queries }),
);
