import type { LucideIcon } from "lucide-react";
import "./TypeCard.css";

interface TypeCardProps {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onSelect: () => void;
}

export function TypeCard({ label, icon: Icon, disabled = false, onSelect }: TypeCardProps) {
  return (
    <button
      type="button"
      className="type-card"
      disabled={disabled}
      onClick={onSelect}
    >
      <Icon size={32} aria-hidden />
      <span>{label}</span>
    </button>
  );
}