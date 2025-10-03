"use client";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { useAnimationSettings } from "@/hooks/useAnimationSettings";

function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)); }

export function AvatarLayered({
  baseSrc,
  eyesClosedSrc,
  answering = false,        // speaking/answering flag from your app
  level = 0,                // audio RMS 0..~0.2 from useSpeakingMic()
  blinking = false,
  className = "w-64 h-64",
  pivot = "50% 85%",
}: {
  baseSrc: string;
  eyesClosedSrc: string;
  answering?: boolean;
  level?: number;
  blinking?: boolean;
  className?: string;
  pivot?: string;
}) {
  const { settings } = useAnimationSettings();
  const [showEmphasis, setShowEmphasis] = useState(false);
  const [prevAnswering, setPrevAnswering] = useState(answering);

  // Audio-reactive amplitude using configurable settings
  const amp = useMemo(() => {
    const a = clamp(level * settings.audio_sensitivity, settings.audio_clamp_min, settings.audio_clamp_max);
    return a;
  }, [level, settings.audio_sensitivity, settings.audio_clamp_min, settings.audio_clamp_max]);

  // Detect start of speaking
  useEffect(() => {
    if (answering && !prevAnswering) {
      setShowEmphasis(true);
      setTimeout(() => setShowEmphasis(false), settings.emphasis_duration);
    }
    setPrevAnswering(answering);
  }, [answering, prevAnswering, settings.emphasis_duration]);

  // Base idle animation using configurable settings
  const idleAnim = {
    rotate: [settings.idle_rotate_min, settings.idle_rotate_max, settings.idle_rotate_min],
    y: [settings.idle_y_min, settings.idle_y_max, settings.idle_y_min, -settings.idle_y_max, settings.idle_y_min],
  };

  // Answering animation (overrides idle when answering) using configurable settings
  const answeringAnim = answering ? {
    y: [0, settings.answering_y_base + amp * settings.answering_y_amp_multiplier, 0],
    rotate: [
      -settings.answering_rotate_base - amp * settings.answering_rotate_amp_multiplier, 
      settings.answering_rotate_base + amp * settings.answering_rotate_amp_multiplier, 
      -settings.answering_rotate_base - amp * settings.answering_rotate_amp_multiplier
    ],
  } : idleAnim;

  // Emphasis animation (quick gesture when starting to speak) using configurable settings
  const emphasisAnim = showEmphasis ? {
    rotate: settings.emphasis_rotate_keyframes,
    y: settings.emphasis_y_keyframes,
  } : {};

  return (
    <motion.div
      className={className + " relative select-none"}
      style={{ transformOrigin: pivot }}
      animate={showEmphasis ? emphasisAnim : answeringAnim}
      transition={showEmphasis ? {
        duration: settings.emphasis_duration / 1000, // Convert ms to seconds
        ease: "easeOut",
      } : {
        times: [0, 0.5, 1],
        duration: answering 
          ? settings.answering_duration_base + (1 - amp) * settings.answering_duration_amp_factor 
          : settings.idle_duration / 1000, // Convert ms to seconds
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <img src={baseSrc} alt="avatar" className="w-full h-full object-contain" />
      {blinking && (
        <motion.img
          src={eyesClosedSrc}
          alt="blink"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        />
      )}
    </motion.div>
  );
}
