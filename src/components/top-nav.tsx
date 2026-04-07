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
    <nav className="nav-grid mb-6">
      {items.map((item) => (
        <Link
          key={item.href}
          className={`nav-link panel-muted ${pathname === item.href ? "nav-link-active" : ""}`}
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
    </nav>
  );
}
