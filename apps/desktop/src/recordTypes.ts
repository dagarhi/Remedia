import { BookImage, BookOpen, Film, Gamepad2, Shapes, Sparkles, Tv, type LucideIcon } from "lucide-react";
import type { RecordStatus } from "@remedia/core";

export interface RecordType {
  /** Template id; also the i18n key under `types.` */
  id: string;
  icon: LucideIcon;
  /** Only movies are available in the first roadmap phase. */
  enabled: boolean;
}

/** The original record types, in the order the add flow shows them. */
export const RECORD_TYPES: RecordType[] = [
  { id: "movie", icon: Film, enabled: true },
  { id: "series", icon: Tv, enabled: false },
  { id: "book", icon: BookOpen, enabled: false },
  { id: "game", icon: Gamepad2, enabled: false },
  { id: "anime", icon: Sparkles, enabled: false },
  { id: "manga", icon: BookImage, enabled: false },
];

/** Icon for a template; custom templates get a generic one. */
export function iconForType(templateId: string): LucideIcon {
  return RECORD_TYPES.find((t) => t.id === templateId)?.icon ?? Shapes;
}

/** Libraries in lifecycle order (UI Design): what you are on, what is next, then the rest. */
export const LIBRARY_ORDER: RecordStatus[] = ["in_progress", "planned", "paused", "completed", "dropped"];
