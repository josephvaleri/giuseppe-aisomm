"use client";

import ProgressRing from "./ProgressRing";
import { cn } from "@/lib/utils";

export default function BadgeCard({
  def,
  tiers,
  progress,
  milestoneVibeMap,
}: {
  def: any;
  tiers: any[];
  progress: any | null;
  milestoneVibeMap?: Record<string, string>;
}) {
  const current = progress?.current_value ?? 0;
  const tier = progress?.current_tier ?? 0;
  const next = (tiers || []).find((t: any) => current < t.threshold);
  const target = next?.threshold ?? (tiers?.[tiers.length - 1]?.threshold ?? 1);

  const locked = def.is_tiered ? tier === 0 : !progress;

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-white/90 backdrop-blur-sm p-4 shadow-sm transition hover:shadow-md relative",
        locked && "opacity-80"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{def.icon_emoji}</div>
        <div>
          <div className="font-semibold">{def.name}</div>
          <div className="text-xs text-muted-foreground">{def.category}</div>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{def.description}</p>

      {def.is_tiered ? (
        <div className="mt-4 flex items-center justify-between">
          <ProgressRing value={current} target={target} />
          <div className="flex-1 ml-3">
            <div className="text-xs mb-1">
              Progress: {current}/{target}
            </div>
            <div className="flex flex-wrap gap-1">
              {(tiers || []).map((t: any) => (
                <span
                  key={t.tier}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded-full border",
                    tier >= t.tier
                      ? "bg-foreground text-background"
                      : "text-muted-foreground"
                  )}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-2 py-1 rounded-full text-[12px] border",
              progress
                ? "bg-foreground text-background"
                : "text-muted-foreground"
            )}
          >
            {progress ? "Unlocked" : "Locked"}
          </div>
          {progress && milestoneVibeMap?.[def.badge_code] && (
            <div className="mt-2 text-sm italic text-muted-foreground">
              {milestoneVibeMap[def.badge_code]}
            </div>
          )}
        </div>
      )}

      {locked && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-black/0 group-hover:to-black/5" />
      )}
    </div>
  );
}
