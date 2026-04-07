"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CLASSIFICATIONS,
  CLASSIFICATION_LABELS,
  REVIEW_STATUS_LABELS,
  type Classification,
} from "@/lib/constants";
import { formatCurrencyFromCents, formatDateLabel } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

type TransactionRow = {
  id: string;
  date: string;
  processedOn: string | null;
  amountCents: number;
  displayAmountCents?: number;
  accountType: "debit" | "credit";
  transactionType: string | null;
  transactionDetails: string;
  merchantName: string | null;
  nabCategory: string | null;
  classification: (typeof CLASSIFICATIONS)[number] | null;
  reviewStatus:
    | "UNREVIEWED"
    | "REVIEWED"
    | "SUGGESTED_EXCLUSION"
    | "CONFIRMED_EXCLUSION";
  exclusionReason: string | null;
  adjustmentNote?: string | null;
  rawRowJson: string;
  importId: string;
  importFilename: string | null;
  createdAt: string;
  updatedAt: string;
};

type TransactionTableProps = {
  mode: "review" | "archive";
  rows: TransactionRow[];
};

type AuditEntry = {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

type RenderItem =
  | { kind: "row"; row: TransactionRow }
  | { kind: "year"; key: string; year: number }
  | { kind: "quarter"; key: string; year: number; quarter: number };

function allowedClassifications(amountCents: number): Classification[] {
  return amountCents > 0
    ? ["INCOME", "EXCLUDED"]
    : ["BUSINESS", "KEVIN", "DAVID", "WENONA", "KEVIN_WENONA", "EXCLUDED"];
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getQuarter(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1;
}

function buildRenderItems(rows: TransactionRow[]): RenderItem[] {
  const items: RenderItem[] = [];
  let previousYear: number | null = null;
  let previousQuarterKey: string | null = null;

  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00`);
    const year = date.getFullYear();
    const quarter = getQuarter(date.getMonth());
    const quarterKey = `${year}-Q${quarter}`;

    if (previousYear !== year) {
      items.push({ kind: "year", key: `year-${year}`, year });
      previousYear = year;
      previousQuarterKey = null;
    }

    if (previousQuarterKey !== quarterKey) {
      items.push({ kind: "quarter", key: `quarter-${quarterKey}`, year, quarter });
      previousQuarterKey = quarterKey;
    }

    items.push({ kind: "row", row });
  }

  return items;
}

export function TransactionTable({ mode, rows }: TransactionTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [classificationDrafts, setClassificationDrafts] = useState<Record<string, string>>({});
  const [exclusionDrafts, setExclusionDrafts] = useState<Record<string, string>>({});
  const [bulkClassification, setBulkClassification] = useState<string>("BUSINESS");
  const [drawerRow, setDrawerRow] = useState<TransactionRow | null>(null);
  const [drawerAudit, setDrawerAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const renderItems = useMemo(() => buildRenderItems(rows), [rows]);
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  );
  const selectedPositiveCount = useMemo(
    () => selectedRows.filter((row) => row.amountCents > 0).length,
    [selectedRows],
  );
  const selectedNegativeCount = useMemo(
    () => selectedRows.filter((row) => row.amountCents < 0).length,
    [selectedRows],
  );

  const bulkAllowedClassifications = useMemo(() => {
    if (selectedRows.length === 0) {
      return [...CLASSIFICATIONS];
    }

    return CLASSIFICATIONS.filter((classification) =>
      selectedRows.every((row) =>
        allowedClassifications(row.amountCents).includes(classification),
      ),
    );
  }, [selectedRows]);
  const effectiveBulkClassification = (bulkAllowedClassifications.includes(
    bulkClassification as Classification,
  )
    ? bulkClassification
    : (bulkAllowedClassifications[0] ?? "EXCLUDED")) as Classification;

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function selectAllVisible() {
    setSelectedIds(rows.map((row) => row.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function refreshAfter(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Request failed.");
      }
    });
  }

  async function saveRow(row: TransactionRow) {
    const nextClassification =
      classificationDrafts[row.id] ??
      row.classification ??
      allowedClassifications(row.amountCents)[0];
    if (!nextClassification) {
      return;
    }

    await refreshAfter(async () => {
      const response = await fetch(`/api/transactions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification: nextClassification,
          exclusionReason:
            nextClassification === "EXCLUDED" ? exclusionDrafts[row.id] || null : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Could not save transaction.");
      }

      setClassificationDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setExclusionDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
    });
  }

  async function bulkAction(action: "classify" | "confirm-exclusion" | "reopen") {
    if (selectedIds.length === 0) {
      setError("Select at least one row first.");
      return;
    }

    await refreshAfter(async () => {
      const body =
        action === "classify"
          ? {
              action,
              ids: selectedIds,
              classification: effectiveBulkClassification,
            }
          : {
              action,
              ids: selectedIds,
            };

      const response = await fetch("/api/transactions/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Bulk action failed.");
      }

      setSelectedIds([]);
      setClassificationDrafts((current) => {
        const next = { ...current };
        for (const id of selectedIds) {
          delete next[id];
        }
        return next;
      });
      setExclusionDrafts((current) => {
        const next = { ...current };
        for (const id of selectedIds) {
          delete next[id];
        }
        return next;
      });
    });
  }

  async function openDrawer(row: TransactionRow) {
    setDrawerRow(row);
    setDrawerAudit([]);
    const response = await fetch(`/api/transactions/${row.id}/audit`);
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    setDrawerAudit(payload.audit ?? []);
  }

  async function confirmSingleExclusion(row: TransactionRow) {
    await refreshAfter(async () => {
      const response = await fetch(`/api/transactions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification: "EXCLUDED",
          exclusionReason: exclusionDrafts[row.id] || row.exclusionReason || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Could not confirm exclusion.");
      }

      setClassificationDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setExclusionDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
    });
  }

  return (
    <div className="panel p-4 md:p-6">
      <div className="mb-5 grid gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            {mode === "review" ? "Review queue" : "Transaction archive"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {mode === "review"
              ? "Resolve unreviewed rows, suggested exclusions, and positive transactions that still need a decision."
              : "Inspect all imported rows, edit classifications, and audit the raw source data."}
          </p>
        </div>

        <div className="bulk-toolbar-grid">
          <section className="bulk-toolbar-group">
            <p className="bulk-toolbar-label">Selection</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="button-secondary" onClick={selectAllVisible} type="button">
                Select all
              </button>
              <button className="button-secondary" onClick={clearSelection} type="button">
                Unselect all
              </button>
            </div>
            <p className="bulk-toolbar-note">
              {selectedIds.length === 0
                ? "No rows selected."
                : `${selectedIds.length} row${selectedIds.length === 1 ? "" : "s"} selected.`}
            </p>
          </section>

          <section className="bulk-toolbar-group">
            <p className="bulk-toolbar-label">Bulk classification</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select w-full min-w-[14rem] flex-1 md:max-w-[18rem]"
                value={effectiveBulkClassification}
                onChange={(event) => setBulkClassification(event.target.value)}
              >
                {bulkAllowedClassifications.map((classification) => (
                  <option key={classification} value={classification}>
                    {CLASSIFICATION_LABELS[classification]}
                  </option>
                ))}
              </select>
              <button
                className="button-primary"
                disabled={selectedIds.length === 0}
                onClick={() => bulkAction("classify")}
                type="button"
              >
                Apply to selected
              </button>
            </div>
            <p className="bulk-toolbar-note">
              {selectedIds.length === 0
                ? "Choose a classification, then apply it to the selected rows."
                : selectedPositiveCount > 0 && selectedNegativeCount > 0
                  ? "This selection mixes positive and negative rows, so only classifications valid for both are available."
                  : selectedPositiveCount > 0
                    ? "Positive rows can only be bulk classified as Income or Excluded."
                    : "Negative rows can be bulk classified as business or personal expense categories."}
            </p>
          </section>

          <section className="bulk-toolbar-group">
            <p className="bulk-toolbar-label">Review status</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="button-secondary"
                disabled={selectedIds.length === 0}
                onClick={() => bulkAction("confirm-exclusion")}
                type="button"
              >
                Confirm selected exclusions
              </button>
              <button
                className="button-secondary"
                disabled={selectedIds.length === 0}
                onClick={() => bulkAction("reopen")}
                type="button"
              >
                Move selected back to review
              </button>
            </div>
            <p className="bulk-toolbar-note">
              Use these for exclusion confirmation or reopening selected rows.
            </p>
          </section>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-[var(--negative)]">{error}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              <th>Date</th>
              <th>Source</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Classification</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderItems.map((item) => {
              if (item.kind === "year") {
                return (
                  <tr key={item.key} className="table-section-row">
                    <td className="table-section-cell" colSpan={9}>
                      <div className="table-section-divider">
                        <span className="table-section-label table-section-label-year">
                          {item.year}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              if (item.kind === "quarter") {
                return (
                  <tr key={item.key} className="table-section-row">
                    <td className="table-section-cell" colSpan={9}>
                      <div className="table-section-divider">
                        <span className="table-section-label table-section-label-quarter">
                          Q{item.quarter} {item.year}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const row = item.row;
              const currentDraft =
                classificationDrafts[row.id] ??
                row.classification ??
                allowedClassifications(row.amountCents)[0];
              const currentExclusionDraft =
                exclusionDrafts[row.id] ?? row.exclusionReason ?? "";
              const savedClassification =
                row.classification ?? allowedClassifications(row.amountCents)[0];
              const savedExclusionReason = row.exclusionReason ?? "";
              const isDirty =
                currentDraft !== savedClassification ||
                (currentDraft === "EXCLUDED" && currentExclusionDraft !== savedExclusionReason);
              const description = row.merchantName || row.transactionDetails;

              return (
                <tr key={row.id} className={isDirty ? "transaction-row-dirty" : undefined}>
                  <td>
                    <input
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="whitespace-nowrap">{formatDateLabel(row.date)}</td>
                  <td>
                    <div className="text-sm font-medium uppercase">{row.accountType}</div>
                    {row.importFilename ? (
                      <div className="text-xs text-[var(--muted)]">{row.importFilename}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="font-medium">{description}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {row.transactionDetails}
                    </div>
                  </td>
                  <td>
                    <div>{row.transactionType ?? "Unspecified"}</div>
                    {row.nabCategory ? (
                      <div className="mt-1 text-xs text-[var(--muted)]">{row.nabCategory}</div>
                    ) : null}
                  </td>
                  <td
                    className={
                      row.amountCents >= 0 ? "amount-positive whitespace-nowrap" : "amount-negative whitespace-nowrap"
                    }
                  >
                    {formatCurrencyFromCents(row.displayAmountCents ?? row.amountCents)}
                    {row.adjustmentNote ? (
                      <div className="mt-1 text-xs text-[var(--muted)]">{row.adjustmentNote}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <StatusBadge
                        label={REVIEW_STATUS_LABELS[row.reviewStatus]}
                        tone={
                          row.reviewStatus === "SUGGESTED_EXCLUSION"
                            ? "exclusion"
                            : row.reviewStatus === "UNREVIEWED"
                              ? "review"
                              : "final"
                        }
                      />
                      {row.exclusionReason ? (
                        <p className="max-w-xs text-xs text-[var(--muted)]">
                          {row.exclusionReason}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="grid gap-2">
                      {isDirty ? (
                        <p className="dirty-indicator">Unsaved change</p>
                      ) : null}
                      <select
                        className="select min-w-[14rem]"
                        value={currentDraft}
                        onChange={(event) =>
                          setClassificationDrafts((drafts) => ({
                            ...drafts,
                            [row.id]: event.target.value,
                          }))
                        }
                      >
                        {allowedClassifications(row.amountCents).map((classification) => (
                          <option key={classification} value={classification}>
                            {CLASSIFICATION_LABELS[classification]}
                          </option>
                        ))}
                      </select>
                      {currentDraft === "EXCLUDED" ? (
                        <input
                          className="input text-sm"
                          onChange={(event) =>
                            setExclusionDrafts((drafts) => ({
                              ...drafts,
                              [row.id]: event.target.value,
                            }))
                          }
                          placeholder="Optional exclusion reason"
                          value={currentExclusionDraft}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className={`button-secondary button-compact${isDirty ? " button-dirty" : ""}`}
                        disabled={isPending}
                        onClick={() => saveRow(row)}
                        type="button"
                      >
                        {isDirty ? "Save change" : "Save"}
                      </button>
                      {row.reviewStatus === "SUGGESTED_EXCLUSION" ? (
                        <button
                          className="button-secondary button-compact"
                          disabled={isPending}
                          onClick={() => void confirmSingleExclusion(row)}
                          type="button"
                        >
                          Confirm
                        </button>
                      ) : null}
                      <button
                        className="inline-action text-left"
                        onClick={() => void openDrawer(row)}
                        type="button"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--muted)]">
          No transactions match the current filters.
        </div>
      ) : null}

      {drawerRow ? (
        <>
          <button
            aria-label="Close details"
            className="drawer-backdrop"
            onClick={() => setDrawerRow(null)}
            type="button"
          />
          <aside className="drawer">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Transaction detail
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  {drawerRow.merchantName || drawerRow.transactionDetails}
                </h3>
              </div>
              <button className="button-secondary" onClick={() => setDrawerRow(null)} type="button">
                Close
              </button>
            </div>

            <div className="panel-muted mt-5 p-4">
              <p className="text-sm font-semibold">Summary</p>
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">Date</dt>
                  <dd>{formatDateLabel(drawerRow.date)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Amount</dt>
                  <dd>{formatCurrencyFromCents(drawerRow.amountCents)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Import file</dt>
                  <dd>{drawerRow.importFilename ?? drawerRow.importId}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Review status</dt>
                  <dd>{REVIEW_STATUS_LABELS[drawerRow.reviewStatus]}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-5 grid gap-5">
              <section className="panel-muted p-4">
                <p className="text-sm font-semibold">Raw source row</p>
                <pre className="mt-3 overflow-auto rounded-2xl bg-[#1f2937] p-4 text-xs text-slate-100">
                  {JSON.stringify(safeParseJson(drawerRow.rawRowJson), null, 2)}
                </pre>
              </section>

              <section className="panel-muted p-4">
                <p className="text-sm font-semibold">Audit history</p>
                <div className="mt-3 space-y-3">
                  {drawerAudit.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No audit entries yet.</p>
                  ) : (
                    drawerAudit.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <p className="text-sm font-semibold">{entry.action}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{entry.createdAt}</p>
                        <pre className="mt-3 overflow-auto rounded-xl bg-white/70 p-3 text-xs">
                          {JSON.stringify(
                            {
                              oldValue: entry.oldValue ? safeParseJson(entry.oldValue) : null,
                              newValue: entry.newValue ? safeParseJson(entry.newValue) : null,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
