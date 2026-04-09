"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResetAllDataPanel() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = confirmation.trim() === "delete" && !isPending;

  function handleDelete() {
    if (!canDelete) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/imports/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Failed to delete all data.");
        return;
      }

      setConfirmation("");
      router.refresh();
    });
  }

  return (
    <section className="panel danger-panel p-6">
      <p className="text-sm uppercase tracking-[0.18em] text-[var(--negative)]">
        Danger zone
      </p>
      <h2 className="mt-2 text-2xl font-semibold">Delete all imported data</h2>
      <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
        This permanently deletes every transaction, every import record, and every audit
        entry. To confirm, type <span className="danger-inline-code">delete</span>.
      </p>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="input md:max-w-sm"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder='Type "delete" to confirm'
          value={confirmation}
        />
        <button
          className="button-danger"
          disabled={!canDelete}
          onClick={handleDelete}
          type="button"
        >
          {isPending ? "Deleting..." : "Delete everything"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--negative)]">{error}</p> : null}
    </section>
  );
}
