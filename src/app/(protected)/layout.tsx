import Link from "next/link";
import { requirePageSession } from "@/lib/auth";
import { TopNav } from "@/components/top-nav";
import { ThemeToggle } from "@/components/theme-toggle";
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

          <div className="flex items-center gap-3">
            <Link aria-label="Open settings" className="icon-button" href="/settings" title="Settings">
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M12 3.75l1.2 2.07 2.37.53-.8 2.3 1.63 1.8-1.63 1.8.8 2.3-2.37.53L12 20.25l-1.2-2.07-2.37-.53.8-2.3-1.63-1.8 1.63-1.8-.8-2.3 2.37-.53L12 3.75Z" />
                <circle cx="12" cy="12" r="3.1" />
              </svg>
            </Link>
            <ThemeToggle />
            <form action="/api/logout" method="post">
              <button className="button-secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        </header>

        <TopNav items={navigation} />

        {children}
      </div>
    </div>
  );
}
