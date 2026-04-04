"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ImportResult = {
  importRecord: {
    addedRows: number;
    duplicateRows: number;
    skippedRows: number;
    suggestedExclusionRows: number;
    totalRows: number;
  };
  skippedRows: Array<{ rowNumber: number; reason: string }>;
};

export function ImportForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file to import.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }

      setResult(payload);
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="panel p-6">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Upload CSV
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Import a debit or credit export</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Account type comes from this upload form, not the CSV row text. Re-uploading
          the same file is safe because imports are deduplicated after normalization.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium">CSV file</label>
          <input className="input" type="file" name="file" accept=".csv,text/csv" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Account type</label>
          <select className="select" name="accountType" defaultValue="debit">
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </div>

        <div className="flex items-end">
          <button className="button-primary w-full" disabled={isPending} type="submit">
            {isPending ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 text-sm text-[var(--negative)]">{error}</p> : null}

      {result ? (
        <div className="panel-muted mt-5 p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <SummaryStat label="Rows" value={result.importRecord.totalRows} />
            <SummaryStat label="Added" value={result.importRecord.addedRows} />
            <SummaryStat label="Duplicates" value={result.importRecord.duplicateRows} />
            <SummaryStat label="Skipped" value={result.importRecord.skippedRows} />
            <SummaryStat
              label="Suggested"
              value={result.importRecord.suggestedExclusionRows}
            />
          </div>

          {result.skippedRows.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold">Skipped rows</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
                {result.skippedRows.slice(0, 8).map((row) => (
                  <li key={`${row.rowNumber}-${row.reason}`}>
                    Row {row.rowNumber}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
