import { BookImage, BookOpen, Film, Gamepad2, Shapes, Sparkles, Tv, type LucideIcon } from "lucide-react";
import type { RecordStatus } from "@remedia/core";

export interface RecordType {
  /** Template id; also the i18n key under `types.` */
  id: string;
  icon: LucideIcon;
  /** False hides the type from the add flow and Settings (kept for future types). */
  enabled: boolean;
}

/** The original record types, in the order the add flow shows them. */
export const RECORD_TYPES: RecordType[] = [
  { id: "movie", icon: Film, enabled: true },
  { id: "series", icon: Tv, enabled: true },
  { id: "book", icon: BookOpen, enabled: true },
  { id: "game", icon: Gamepad2, enabled: true },
  { id: "anime", icon: Sparkles, enabled: true },
  { id: "manga", icon: BookImage, enabled: true },
];

/** Icon for a template; custom templates get a generic one. */
export function iconForType(templateId: string): LucideIcon {
  if (templateId === "season") return Tv;
  return RECORD_TYPES.find((t) => t.id === templateId)?.icon ?? Shapes;
}

/** Libraries in lifecycle order (UI Design): what you are on, what is next, then the rest. */
export const LIBRARY_ORDER: RecordStatus[] = ["in_progress", "planned", "paused", "completed", "dropped"];
