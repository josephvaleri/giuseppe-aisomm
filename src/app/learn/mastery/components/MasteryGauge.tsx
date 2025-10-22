'use client';
import React from "react";
import { Crown } from 'lucide-react';

interface MasteryGaugeProps {
  value: number;
}

/**
 * MasteryGauge — 0 on LEFT, 50 on RIGHT; arc across TOP hemisphere.
 * Needle is a single line from center pointing to the arc (apex up).
 *
 * Value→Arc mapping (bands/ticks):
 *   arcAngle(v) = 180 + 180 * ((v - min) / (max - min))  // 180..360 (top)
 *
 * EXPECTED BEHAVIOR (confirm with user):
 * - The colored semicircle runs left→right along the TOP of the circle
 *   (0 at far left, 50 at far right).
 * - The needle always points UP toward the arc at the correct value.
 * - Numeric readout shows the current value (no animation).
 *
 * NOTE: Previous syntax error came from a stray line
 *   `}, [targetNeedleAngle, angleMv]);` outside any hook/function.
 * This rewrite removes that line and any unused animation code.
 */
export default function MasteryGauge({ value }: MasteryGaugeProps) {
  const min = 0;
  const max = 50;
  const title = "Mastery";
  const showTicks = true;

  // Clamp
  const clamped = Math.max(min, Math.min(max, value));
  const range = Math.max(1, max - min);

  // Geometry (reduced by 40%)
  const size = 216; // svg viewport (360 * 0.6)
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const stroke = 14; // reduced proportionally

  // Segments (value units)
  const segments = [
    { start: 0, end: 9, color: "#ef4444" },
    { start: 10, end: 19, color: "#f472b6" },
    { start: 20, end: 29, color: "#fb923c" },
    { start: 30, end: 39, color: "#facc15" },
    { start: 40, end: 50, color: "#22c55e" },
  ];

  // Map a value to a top-hemisphere angle (180° left → 360° right)
  const valueToArcAngle = (v: number) => 180 + 180 * ((v - min) / range);

  // Polar helper
  const polar = (angleDeg: number, rad: number) => {
    const a = (Math.PI / 180) * angleDeg;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  };

  // Donut-arc path for band
  const arcPath = (startDeg: number, endDeg: number, inner: number, outer: number) => {
    const sO = polar(startDeg, outer);
    const eO = polar(endDeg, outer);
    const sI = polar(endDeg, inner);
    const eI = polar(startDeg, inner);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    const sweepOuter = 1; // top arcs sweep CCW (increasing angle)
    const sweepInner = 0;
    return [
      `M ${sO.x} ${sO.y}`,
      `A ${outer} ${outer} 0 ${large} ${sweepOuter} ${eO.x} ${eO.y}`,
      `L ${sI.x} ${sI.y}`,
      `A ${inner} ${inner} 0 ${large} ${sweepInner} ${eI.x} ${eI.y}`,
      "Z",
    ].join(" ");
  };

  // Needle endpoint
  const needleAngle = valueToArcAngle(clamped);
  const needleEnd = polar(needleAngle, r - stroke / 2);

  // Ticks every 5
  const tickValues = Array.from({ length: Math.floor(range / 5) + 1 }, (_, i) => min + i * 5);

  const isMaestro = clamped >= 40;

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4" role="img" aria-label={`${title} gauge: ${clamped} points out of ${max}`}>

      <div className="relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
          {/* Bands */}
          {segments.map((seg, i) => {
            const start = valueToArcAngle(seg.start);
            const end = valueToArcAngle(seg.end);
            const d = arcPath(start, end, r - stroke, r);
            return <path key={i} d={d} fill={seg.color} opacity={0.95} />;
          })}

          {/* Optional ticks */}
          {showTicks && (
            <g>
              {tickValues.map((t, i) => {
                const a = valueToArcAngle(t);
                const p1 = polar(a, r + 2);
                const p2 = polar(a, r - stroke - 10);
                return (
                  <g key={t}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0f172a" strokeWidth={i % 2 === 0 ? 2 : 1} opacity={0.18} />
                    {i % 2 === 0 && (
                      <text x={polar(a, r - stroke - 22).x} y={polar(a, r - stroke - 22).y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#475569">{t}</text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Center pivot */}
          <circle cx={cx} cy={cy} r={8} fill="#0f172a" />

          {/* Needle (simple line from center to arc on TOP hemisphere) */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="#0f172a"
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* Center cap */}
          <circle cx={cx} cy={cy} r={10} fill="#0f172a" />
          <circle cx={cx} cy={cy} r={5} fill="#ffffff" />
        </svg>

        {/* Readout */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ paddingTop: '60%' }}>
          <div className="text-xl font-bold tabular-nums text-neutral-800">{clamped}</div>
          {isMaestro && (
            <div className="absolute top-0 right-0">
              <Crown size={12} className="text-yellow-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
