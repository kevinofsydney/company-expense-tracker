import Link from "next/link";
import { DashboardCards } from "@/components/dashboard-cards";
import { ImportForm } from "@/components/import-form";
import { compactNumber, formatDateLabel } from "@/lib/format";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { listImports } from "@/lib/services/imports";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, importHistory] = await Promise.all([
    getDashboardSummary(),
    listImports(),
  ]);

  return (
    <div className="grid gap-6">
      <DashboardCards summary={summary} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ImportForm />

        <section className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Latest imports
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Recent import history</h2>
            </div>
            <Link className="button-secondary" href="/imports">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {importHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="panel-muted flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{item.filename}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatDateLabel(item.uploadedAt.slice(0, 10))} · {item.accountType}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm md:text-right">
                  <Stat label="Added" value={item.addedRows} />
                  <Stat label="Dupes" value={item.duplicateRows} />
                  <Stat label="Skipped" value={item.skippedRows} />
                  <Stat label="Suggested" value={item.suggestedExclusionRows} />
                </div>
              </div>
            ))}

            {importHistory.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No imports yet. Upload a debit or credit CSV to start building the ledger.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold">{compactNumber(value)}</p>
    </div>
  );
}
