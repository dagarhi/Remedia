import { settings as settingsTable } from "../db/schema";
import { isValidSettingValue, SETTING_DEFAULTS, type Settings } from "../settings";
import type { DataContext } from "./context";

/**
 * Every setting: stored values over the defaults. Unknown keys and invalid values
 * are ignored (a newer or broken value never breaks the app).
 */
export async function loadSettings(ctx: DataContext): Promise<Settings> {
  const rows = await ctx.db.select().from(settingsTable);
  const result: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (isValidSettingValue(row.key, row.value)) result[row.key] = row.value;
  }
  // Every value was checked by isValidSettingValue, so the shape matches.
  return result as unknown as Settings;
}

/** Stores one setting (insert or replace). Rows are never deleted: resetting stores the default. */
export async function saveSetting<K extends keyof Settings & string>(
  ctx: DataContext,
  key: K,
  value: NonNullable<Settings[K]>,
): Promise<void> {
  if (!isValidSettingValue(key, value)) throw new Error(`Invalid value for setting ${key}`);
  const now = ctx.now();
  await ctx.db
    .insert(settingsTable)
    .values({ key, value, updated_at: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updated_at: now } });
}
