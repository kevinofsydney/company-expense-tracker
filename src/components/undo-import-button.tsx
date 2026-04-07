"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  addedRows: number;
};

export function UndoImportButton({ id, addedRows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleUndo() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/imports/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Failed to undo import.");
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)]">
          Remove {addedRows} row{addedRows !== 1 ? "s" : ""}?
        </span>
        <button
          className="button-secondary button-compact"
          disabled={isPending}
          onClick={handleUndo}
          type="button"
        >
          {isPending ? "Undoing…" : "Confirm"}
        </button>
        <button
          className="button-secondary button-compact"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          type="button"
        >
          Cancel
        </button>
        {error ? <span className="text-xs text-[var(--negative)]">{error}</span> : null}
      </div>
    );
  }

  return (
    <button
      className="button-secondary button-compact"
      onClick={() => setConfirming(true)}
      type="button"
    >
      Undo
    </button>
  );
}
