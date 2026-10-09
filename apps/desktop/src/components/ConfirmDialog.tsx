import { useEffect, useRef } from "react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  // Direct access to the <dialog> HTML element (like @ViewChild in Angular).
  const ref = useRef<HTMLDialogElement>(null);

  // Open or close the native dialog whenever `open` changes.
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <dialog ref={ref} className="confirm-dialog" onCancel={onCancel}>
      <h2>{title}</h2>
      <p>{message}</p>
        <div className="confirm-dialog-actions">
            <button type="button" className="button button--secondary" onClick={onCancel}>
                {cancelLabel}
            </button>
            <button type="button" className="button button--primary" onClick={onConfirm}>
                {confirmLabel}
            </button>
        </div>
    </dialog>
  );
}
