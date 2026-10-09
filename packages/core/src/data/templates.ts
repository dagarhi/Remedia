import { and, eq, isNull } from "drizzle-orm";
import { codeTemplateFor } from "../builtInTemplates";
import { templates } from "../db/schema";
import { buildEffectiveTemplate, type EffectiveTemplate } from "../effectiveTemplate";
import type { DataContext } from "./context";

/** The template as the app uses it (code part + user changes), or undefined if it does not exist or was deleted. */
export async function loadEffectiveTemplate(
  ctx: DataContext,
  templateId: string,
): Promise<EffectiveTemplate | undefined> {
  const row = await ctx.db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), isNull(templates.deleted_at)))
    .get();
  if (!row) return undefined;
  return buildEffectiveTemplate(codeTemplateFor(templateId), row.definition);
}
