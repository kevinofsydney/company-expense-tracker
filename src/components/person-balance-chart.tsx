"use client";

import { useState } from "react";
import type { BalancePoint } from "@/lib/services/dashboard";
import type { PersonView } from "@/lib/domain/calculations";

const PERSON_COLOR: Record<PersonView, string> = {
  KEVIN: "#8a3b12",
  DAVID: "#0f766e",
  WENONA: "#7c3aed",
};

function fmtAxis(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

const W = 800;
const H = 210;
const PL = 68;
const PR = 20;
const PT = 20;
const PB = 44;
const CHART_W = W - PL - PR;
const CHART_H = H - PT - PB;

export function PersonBalanceChart({
  points,
  personView,
}: {
  points: BalancePoint[];
  personView: PersonView;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length === 0) return null;

  const color = PERSON_COLOR[personView];
  const balances = points.map((p) => p.balanceCents);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const range = maxB - minB || 10000; // fallback so we don't divide by zero
  const yPad = range * 0.18;
  const yMin = minB - yPad;
  const yMax = maxB + yPad;
  const yRange = yMax - yMin;

  function getX(i: number) {
    return points.length === 1 ? PL + CHART_W / 2 : PL + (i / (points.length - 1)) * CHART_W;
  }

  function getY(b: number) {
    return PT + CHART_H - ((b - yMin) / yRange) * CHART_H;
  }

  const zeroY = Math.min(Math.max(getY(0), PT), PT + CHART_H);
  const linePoints = points.map((p, i) => `${getX(i)},${getY(p.balanceCents)}`).join(" ");
  const areaPath =
    points.length >= 2
      ? [
          `M ${getX(0)},${zeroY}`,
          ...points.map((p, i) => `L ${getX(i)},${getY(p.balanceCents)}`),
          `L ${getX(points.length - 1)},${zeroY}`,
          "Z",
        ].join(" ")
      : "";

  const yTicks = [0, 1, 2, 3, 4].map((i) => yMin + (i / 4) * yRange);
  const xStep = points.length > 10 ? Math.ceil(points.length / 8) : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Y grid lines */}
      {yTicks.map((v, i) => (
        <line
          key={i}
          x1={PL}
          y1={getY(v)}
          x2={W - PR}
          y2={getY(v)}
          stroke="rgba(84,70,35,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* Zero dashed line when range crosses zero */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PL}
          y1={getY(0)}
          x2={W - PR}
          y2={getY(0)}
          stroke="rgba(84,70,35,0.22)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
      )}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill={color} fillOpacity="0.09" />}

      {/* Line */}
      {points.length >= 2 && (
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Hover vertical rule */}
      {hovered !== null && (
        <line
          x1={getX(hovered)}
          y1={PT}
          x2={getX(hovered)}
          y2={PT + CHART_H}
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      )}

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(p.balanceCents)}
          r={hovered === i ? 5.5 : 3.5}
          fill={color}
          fillOpacity={hovered === i ? 1 : 0.65}
          style={{ transition: "r 80ms, fill-opacity 80ms" }}
        />
      ))}

      {/* Tooltip */}
      {hovered !== null &&
        (() => {
          const x = getX(hovered);
          const y = getY(points[hovered].balanceCents);
          const ttW = 128;
          const ttH = 42;
          const ttX = Math.min(Math.max(x - ttW / 2, PL), W - PR - ttW);
          const ttY = y - ttH - 12 < PT ? y + 12 : y - ttH - 12;
          return (
            <g pointerEvents="none">
              <rect
                x={ttX}
                y={ttY}
                width={ttW}
                height={ttH}
                rx="8"
                fill="white"
                fillOpacity="0.96"
                stroke="rgba(84,70,35,0.14)"
                strokeWidth="1"
              />
              <text
                x={ttX + ttW / 2}
                y={ttY + 15}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(107,114,128,0.9)"
              >
                {points[hovered].label}
              </text>
              <text
                x={ttX + ttW / 2}
                y={ttY + 31}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill={color}
              >
                {fmtAxis(points[hovered].balanceCents)}
              </text>
            </g>
          );
        })()}

      {/* Y-axis labels */}
      {yTicks.map((v, i) => (
        <text
          key={i}
          x={PL - 7}
          y={getY(v)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="11"
          fill="rgba(107,114,128,0.9)"
        >
          {fmtAxis(v)}
        </text>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => {
        if (i % xStep !== 0 && i !== points.length - 1) return null;
        return (
          <text
            key={i}
            x={getX(i)}
            y={H - PB + 17}
            textAnchor="middle"
            fontSize="11"
            fill={hovered === i ? color : "rgba(107,114,128,0.9)"}
            fontWeight={hovered === i ? "600" : "normal"}
          >
            {p.label}
          </text>
        );
      })}

      {/* Transparent hit areas */}
      {points.map((_p, i) => {
        const slotW =
          points.length === 1 ? CHART_W : CHART_W / (points.length - 1);
        const hitX = Math.max(PL, getX(i) - slotW / 2);
        return (
          <rect
            key={i}
            x={hitX}
            y={PT}
            width={slotW}
            height={CHART_H}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default" }}
          />
        );
      })}
    </svg>
  );
}
