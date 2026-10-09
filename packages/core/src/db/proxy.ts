/*
 * Contract between Drizzle's sqlite-proxy driver and whatever actually runs SQLite
 * (a Tauri command on desktop, node:sqlite in tests). Drizzle builds the SQL; the
 * platform only executes it and returns rows as arrays of column values.
 */

/** JSON-compatible SQL parameter or column value. */
export type SqlValue = string | number | boolean | null;

/** "run": no rows; "get": first row only; "all" / "values": every row. */
export type SqlMethod = "run" | "all" | "values" | "get";

export interface SqlQuery {
  sql: string;
  params: SqlValue[];
  method: SqlMethod;
}

/** For "get" `rows` is one row (or undefined when there is none); otherwise a list of rows. */
export interface SqlResult {
  rows: SqlValue[] | SqlValue[][] | undefined;
}

/** Runs one statement. */
export type SqlExecutor = (query: SqlQuery) => Promise<SqlResult>;

/** Runs several statements in one transaction: all succeed or none is applied. */
export type SqlBatchExecutor = (queries: SqlQuery[]) => Promise<SqlResult[]>;
