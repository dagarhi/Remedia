import type {
  CodeTemplateDefinition,
  FieldDefinition,
  FieldType,
  ProgressDefinition,
  UserTemplateDefinition,
} from "./template";

/** Built-in labels are translated by the UI; user labels are shown as typed. */
export type Label = { kind: "i18n"; key: string } | { kind: "text"; text: string };

export interface EffectiveOption {
  key: string;
  label: Label;
}

export interface EffectiveField {
  key: string;
  type: FieldType;
  label: Label;
  required: boolean;
  unit?: string;
  options?: EffectiveOption[];
  hidden: boolean;
  /** Defined by the developer (readable key) rather than added by the user (UUID key). */
  builtIn: boolean;
}

/** The template the app actually uses: code part + user part combined. */
export interface EffectiveTemplate {
  /** In display order, hidden fields included (their data is kept). */
  fields: EffectiveField[];
  /** Identity field keys; `title` is always an identity field and is not listed. */
  identity: string[];
  progress: ProgressDefinition | null;
}

function fromUser(field: FieldDefinition): EffectiveField {
  return {
    key: field.key,
    type: field.type,
    label: { kind: "text", text: field.label },
    required: field.required,
    unit: field.unit,
    options: field.options?.map((o) => ({ key: o.key, label: { kind: "text", text: o.label } })),
    hidden: field.hidden ?? false,
    builtIn: false,
  };
}

function fromCode(field: FieldDefinition, user: UserTemplateDefinition): EffectiveField {
  const override = user.overrides?.[field.key] ?? {};
  const builtInOptions = field.options?.map((o) => ({ key: o.key, label: { kind: "i18n", key: o.label } as Label }));
  const addedOptions = (override.added_options ?? []).map((o) => ({ key: o.key, label: { kind: "text", text: o.label } as Label }));
  return {
    key: field.key,
    type: field.type,
    label: override.label !== undefined ? { kind: "text", text: override.label } : { kind: "i18n", key: field.label },
    required: field.required,
    unit: field.unit,
    options: builtInOptions ? [...builtInOptions, ...addedOptions] : undefined,
    hidden: override.hidden ?? false,
    builtIn: true,
  };
}

/** Orders fields by `order`; fields it does not mention (e.g. added by an app update) go last in default order. */
function applyOrder(fields: EffectiveField[], order: string[] | undefined): EffectiveField[] {
  if (!order) return fields;
  const position = new Map(order.map((key, i) => [key, i]));
  const ranked = fields.filter((f) => position.has(f.key)).sort((a, b) => position.get(a.key)! - position.get(b.key)!);
  return [...ranked, ...fields.filter((f) => !position.has(f.key))];
}

/**
 * Combines the developer's definition with the user's changes. Pass `null` as `code`
 * for a custom template. Where the user changed a property, the user wins; everything
 * else follows the code, so app updates still apply to untouched properties.
 */
export function buildEffectiveTemplate(
  code: CodeTemplateDefinition | null,
  user: UserTemplateDefinition,
): EffectiveTemplate {
  const fields = applyOrder(
    [...(code?.fields ?? []).map((f) => fromCode(f, user)), ...(user.added ?? []).map(fromUser)],
    user.order,
  );
  const keys = new Set(fields.map((f) => f.key));

  // Identity and progress belong to the developer on built-in templates, to the user on custom ones.
  const identity = (code ? code.identity : (user.identity ?? [])).filter((key) => keys.has(key));
  const progress = code ? code.progress : (user.progress ?? null);

  return { fields, identity, progress };
}
