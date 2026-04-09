"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CLASSIFICATION_LABELS, type Classification } from "@/lib/constants";

type Rule = {
  id: string;
  pattern: string;
  classification: Classification;
};

export function ClassificationRulesPanel({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pattern, setPattern] = useState("");
  const [classification, setClassification] = useState<Classification>("BUSINESS");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function addRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/settings/classification-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, classification }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to add rule.");
      return;
    }

    setPattern("");
    setClassification("BUSINESS");
    refresh();
  }

  async function deleteRule(id: string) {
    setError(null);

    const response = await fetch(`/api/settings/classification-rules/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Unable to delete rule.");
      return;
    }

    refresh();
  }

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Classification rules
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Automatic import rules</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Rules are applied during CSV import. Matching is case-insensitive. Plain text
          uses contains matching, and <code className="inline-code-soft">*</code> can be used as
          a wildcard, for example <code className="inline-code-soft">*wages*</code>.
        </p>
      </section>

      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Add rule
        </p>
        <form className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px_auto]" onSubmit={addRule}>
          <input
            className="input"
            onChange={(event) => setPattern(event.target.value)}
            placeholder="Pattern, e.g. Google or *wages*"
            value={pattern}
          />
          <select
            className="select"
            onChange={(event) => setClassification(event.target.value as Classification)}
            value={classification}
          >
            <option value="INCOME">{CLASSIFICATION_LABELS.INCOME}</option>
            <option value="BUSINESS">{CLASSIFICATION_LABELS.BUSINESS}</option>
            <option value="KEVIN">{CLASSIFICATION_LABELS.KEVIN}</option>
            <option value="DAVID">{CLASSIFICATION_LABELS.DAVID}</option>
            <option value="WENONA">{CLASSIFICATION_LABELS.WENONA}</option>
            <option value="KEVIN_WENONA">{CLASSIFICATION_LABELS.KEVIN_WENONA}</option>
            <option value="EXCLUDED">{CLASSIFICATION_LABELS.EXCLUDED}</option>
          </select>
          <button className="button-primary" disabled={isPending} type="submit">
            Add rule
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-[var(--negative)]">{error}</p> : null}
      </section>

      <section className="panel p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Current rules
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{rules.length} active rules</h2>
          </div>
        </div>

        <div className="mt-5 table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Classification</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <code className="inline-code-soft">{rule.pattern}</code>
                  </td>
                  <td>{CLASSIFICATION_LABELS[rule.classification]}</td>
                  <td className="text-right">
                    <button
                      className="button-secondary button-compact"
                      disabled={isPending}
                      onClick={() => void deleteRule(rule.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
