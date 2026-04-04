type StatusBadgeProps = {
  label: string;
  tone: "review" | "final" | "exclusion";
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const className =
    tone === "review"
      ? "status-badge status-review"
      : tone === "exclusion"
        ? "status-badge status-exclusion"
        : "status-badge status-final";

  return <span className={className}>{label}</span>;
}
