"use client";

import { useEffect, useState } from "react";
import { formatCurrencyFromCents } from "@/lib/format";

type DashboardFloatingControlsProps = {
  kevinBalance: number;
  davidBalance: number;
  wenonaBalance: number;
};

export function DashboardFloatingControls({
  kevinBalance,
  davidBalance,
  wenonaBalance,
}: DashboardFloatingControlsProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;

      setShowSummary(scrollTop > 220);
      setShowScrollTop(scrollTop > 320);
      setScrollProgress(scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="page-progress-track">
        <div
          className="page-progress-bar"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      {showSummary ? (
        <div className="sticky-summary panel">
          <BalanceItem label="Kevin" value={kevinBalance} />
          <BalanceItem label="David" value={davidBalance} />
          <BalanceItem label="Wenona" value={wenonaBalance} />
        </div>
      ) : null}

      {showScrollTop ? (
        <button
          aria-label="Scroll to top"
          className="scroll-top-button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          type="button"
        >
          Top
        </button>
      ) : null}
    </>
  );
}

function BalanceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="sticky-summary-item">
      <p className="sticky-summary-label">{label}</p>
      <p className="sticky-summary-value">{formatCurrencyFromCents(value)}</p>
    </div>
  );
}
