import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div
            className={`p-2 rounded-full ${
              variant === "danger" ? "bg-error/10" : "bg-warning/10"
            }`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${
                variant === "danger" ? "text-error" : "text-warning"
              }`}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-base-content/70 mt-1">{message}</p>
          </div>
        </div>
        <div className="modal-action">
          <button onClick={onCancel} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${variant === "danger" ? "btn-error" : "btn-warning"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
