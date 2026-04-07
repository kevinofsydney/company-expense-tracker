import { requirePageSession } from "@/lib/auth";
import { TopNav } from "@/components/top-nav";
import { getDashboardSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();
  const summary = await getDashboardSummary();
  const navigation = [
    { href: "/", label: "Dashboard" },
    { href: "/imports", label: "Imports" },
    { href: "/review", label: "Review", badgeCount: summary.pendingReviewCount },
    { href: "/transactions", label: "Transactions" },
  ];

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <header className="panel mb-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Courant Transaction Tracker
            </p>
          </div>

          <form action="/api/logout" method="post">
            <button className="button-secondary" type="submit">
              Log out
            </button>
          </form>
        </header>

        <TopNav items={navigation} />

        {children}
      </div>
    </div>
  );
}
