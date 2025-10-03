"use client";
import { useEffect, useState } from "react";

export function useHeadAim(speed = 0.18, amp = 0.06) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setT((p) => p + speed / 60); raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [speed]);
  const x = 0.5 + Math.sin(t) * amp;
  const y = 0.5 + Math.cos(t * 0.8) * amp;
  return { headX: Math.max(0, Math.min(1, x)), headY: Math.max(0, Math.min(1, y)) };
}






