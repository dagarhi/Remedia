import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import "./Select.css";

/**
 * A <select> with our own arrow. The browser's arrow ignores padding and theme colours,
 * so it is hidden (appearance: none) and a ChevronDown icon is drawn on top instead.
 * Accepts every normal <select> prop (value, onChange, id, children…).
 */
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`select ${className}`}>
      <select {...props} />
      <ChevronDown size={16} className="select-arrow" aria-hidden />
    </span>
  );
}
