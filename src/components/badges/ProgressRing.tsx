"use client";

export default function ProgressRing({ value, target, size = 72 }: { value: number; target: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, target ? value / target : 0));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeOpacity={0.15}
        stroke="currentColor"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        stroke="currentColor"
        fill="none"
        className="text-foreground"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="text-xs font-semibold"
      >
        {Math.floor(pct * 100)}%
      </text>
    </svg>
  );
}
