import Link from "next/link";
import { requirePageSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/imports", label: "Imports" },
  { href: "/review", label: "Review" },
  { href: "/transactions", label: "Transactions" },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();

  return (
    <div className="app-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <header className="panel mb-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Courant Profit Tracker
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Reviewable imports, auditable decisions, provisional totals.
            </h1>
          </div>

          <form action="/api/logout" method="post">
            <button className="button-secondary" type="submit">
              Log out
            </button>
          </form>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {navigation.map((item) => (
            <Link key={item.href} className="nav-link panel-muted" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
