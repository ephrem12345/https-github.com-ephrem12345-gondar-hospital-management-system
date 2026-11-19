"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary" | "success";
  loading?: boolean;
}

/** Destructive/important-action confirmation built on the shared Modal. */
export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmationDialogProps) {
  const [working, setWorking] = useState(false);

  const handleConfirm = async () => {
    try {
      setWorking(true);
      await onConfirm();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!working && !loading}
    >
      <div className="flex gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger dark:bg-danger/15">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={working || loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone}
          onClick={handleConfirm}
          loading={working || loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
