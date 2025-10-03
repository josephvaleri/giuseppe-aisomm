"use client";
import { useEffect, useRef, useState } from "react";
import { useAnimationSettings } from "./useAnimationSettings";

type Opts = {
  answering?: boolean;
};

export function useBlink(opts: Opts = {}) {
  const { answering = false } = opts;
  const { settings } = useAnimationSettings();
  const [blink, setBlink] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let tid: any;

    const loop = () => {
      // Use configurable speed multiplier when answering
      const speedMultiplier = answering ? settings.blink_speed_multiplier : 1;
      const min = Math.max(500, settings.blink_base_min / speedMultiplier);
      const max = Math.max(min + 1, settings.blink_base_max / speedMultiplier);
      tid = setTimeout(() => {
        if (!alive.current) return;
        setBlink(true);
        setTimeout(() => setBlink(false), settings.blink_duration);
        loop();
      }, Math.floor(Math.random() * (max - min)) + min);
    };

    loop();
    return () => { alive.current = false; clearTimeout(tid); };
  }, [settings.blink_base_min, settings.blink_base_max, settings.blink_duration, settings.blink_speed_multiplier, answering]);

  return blink;
}



