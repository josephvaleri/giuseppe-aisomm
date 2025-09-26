"use client";
import { useEffect, useState } from "react";

export function useBlink(min = 2400, max = 5200) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let alive = true, id: any;
    const schedule = () => {
      id = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        requestAnimationFrame(() => setBlink(false));
        schedule();
      }, Math.floor(Math.random() * (max - min)) + min);
    };
    schedule();
    return () => { alive = false; clearTimeout(id); };
  }, [min, max]);
  return blink;
}

