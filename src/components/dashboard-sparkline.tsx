type DashboardSparklineProps = {
  values: number[];
  tone?: "brand" | "success" | "danger" | "neutral";
};

const toneClassMap = {
  brand: "dashboard-sparkline-brand",
  success: "dashboard-sparkline-success",
  danger: "dashboard-sparkline-danger",
  neutral: "dashboard-sparkline-neutral",
} as const;

export function DashboardSparkline({
  values,
  tone = "neutral",
}: DashboardSparklineProps) {
  if (values.length < 2) {
    return <div className={`dashboard-sparkline dashboard-sparkline-empty ${toneClassMap[tone]}`} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const width = 120;
  const height = 34;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={`dashboard-sparkline ${toneClassMap[tone]}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
