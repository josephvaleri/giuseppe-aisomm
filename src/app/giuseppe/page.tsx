"use client";

import AvatarRive from "@/components/AvatarRive";
import { useBlink } from "@/hooks/useBlink";
import { useHeadAim } from "@/hooks/useHeadAim";
import { useSpeaking } from "@/hooks/useSpeaking";

const RIVE_URL = process.env.NEXT_PUBLIC_GIUSEPPE_RIVE_URL!; // set this in Vercel env

export default function Page() {
  const blinkNow = useBlink();
  const { headX, headY } = useHeadAim();
  const { speaking, mouthOpen } = useSpeaking();

  return (
    <div className="min-h-screen grid place-items-center p-8 bg-neutral-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Giuseppe RIVE Demo</h1>
        <AvatarRive
          src={RIVE_URL}
          className="w-[360px] h-[360px]"
          blinkNow={blinkNow}
          speaking={speaking}
          mouthOpen={mouthOpen}
          headX={headX}
          headY={headY}
          mood={0}
        />
        <div className="mt-8 text-white">
          <p className="text-lg mb-4">🎤 Speak to see Giuseppe respond!</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Blinking: {blinkNow ? "👁️" : "👀"}</div>
            <div>Speaking: {speaking ? "🗣️" : "🤐"}</div>
            <div>Head X: {headX.toFixed(2)}</div>
            <div>Head Y: {headY.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

