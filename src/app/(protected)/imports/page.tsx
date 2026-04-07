import { ImportForm } from "@/components/import-form";
import { UndoImportButton } from "@/components/undo-import-button";
import { compactNumber, formatDateLabel } from "@/lib/format";
import { listImports } from "@/lib/services/imports";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const importHistory = await listImports();

  return (
    <div className="grid gap-6">
      <ImportForm />

      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Import history
        </p>
        <h2 className="mt-2 text-2xl font-semibold">All imports</h2>

        <div className="mt-5 table-wrap">
          <table>
            <thead>
              <tr>
                <th>Uploaded</th>
                <th>Filename</th>
                <th>Account</th>
                <th>Total rows</th>
                <th>Added</th>
                <th>Duplicates</th>
                <th>Skipped</th>
                <th>Suggested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {importHistory.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateLabel(item.uploadedAt.slice(0, 10))}</td>
                  <td>{item.filename}</td>
                  <td className="uppercase">{item.accountType}</td>
                  <td>{compactNumber(item.totalRows)}</td>
                  <td>{compactNumber(item.addedRows)}</td>
                  <td>{compactNumber(item.duplicateRows)}</td>
                  <td>{compactNumber(item.skippedRows)}</td>
                  <td>{compactNumber(item.suggestedExclusionRows)}</td>
                  <td>
                    <UndoImportButton id={item.id} addedRows={item.addedRows} />
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
