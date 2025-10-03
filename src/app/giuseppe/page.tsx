"use client";
import { useEffect, useState } from "react";
import { AvatarLayered } from "@/components/AvatarLayered";
import { useBlink } from "@/hooks/useBlink";
import { useSpeakingMic } from "@/hooks/useSpeakingMic";

export default function Page() {
  const base = "/giuseppe_v3_layers/giuseppe_root/base_open.png";
  const closed = "/giuseppe_v3_layers/giuseppe_root/eyes_closed.png";

  const { speaking, level } = useSpeakingMic(); // mic -> speaking + rms level
  const answering = speaking;                   // or tie this to your LLM "answering" state
  const blinking = useBlink({ speedMultiplier: answering ? 1.35 : 1 });

  // demo UI tint
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", answering ? "#2ecc71" : "#6e56cf");
  }, [answering]);

  return (
    <main className="min-h-dvh bg-neutral-950 text-white grid place-items-center p-8">
      <div className="grid gap-6">
        <AvatarLayered
          baseSrc={base}
          eyesClosedSrc={closed}
          answering={answering}
          level={level}
          blinking={blinking}
          className="w-72 h-72"
        />
        <p className="text-center opacity-80 text-sm">
          Talking adds audio-reactive bob/tilt + a quick emphasis when speech begins.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm text-center">
          <div>Blinking: {blinking ? "👁️" : "👀"}</div>
          <div>Speaking: {answering ? "🗣️" : "🤐"}</div>
          <div>Level: {level.toFixed(3)}</div>
          <div>Speed: {answering ? "1.35x" : "1x"}</div>
        </div>
      </div>
    </main>
  );
}






