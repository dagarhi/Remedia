import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SqlBatchExecutor, SqlExecutor, SqlValue } from "./proxy";
import * as schema from "./schema";

// Drizzle types `rows` as any[], but for "get" it expects the row itself or undefined.
type DrizzleResult = { rows: any[] };

/**
 * Creates the typed Drizzle client on top of a platform executor. Each app passes its
 * own executor (Tauri `invoke` on desktop), so queries are written once, here in core.
 */
export function createDatabase(execute: SqlExecutor, executeBatch: SqlBatchExecutor) {
  return drizzle(
    async (sql, params, method) =>
      (await execute({ sql, params: params as SqlValue[], method })) as DrizzleResult,
    async (queries) =>
      (await executeBatch(
        queries.map((q) => ({ sql: q.sql, params: q.params as SqlValue[], method: q.method })),
      )) as DrizzleResult[],
    { schema },
  );
}

export type Database = ReturnType<typeof createDatabase>;
