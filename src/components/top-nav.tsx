"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  badgeCount?: number;
};

export function TopNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="nav-shell mb-6" role="tablist" aria-label="Primary">
      <div className="nav-grid">
        {items.map((item) => (
          <Link
            key={item.href}
            className={`nav-link ${pathname === item.href ? "nav-link-active" : ""}`}
            href={item.href}
          >
            <span>{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <span className="nav-badge" aria-label={`${item.badgeCount} transactions pending review`}>
                {item.badgeCount}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
