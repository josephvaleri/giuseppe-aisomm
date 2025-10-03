"use client";

import { useEffect, useRef } from "react";
import { useRive, useStateMachineInput, Fit, Alignment } from "@rive-app/react-canvas";

const MACHINE = "AvatarState";

export default function AvatarRive({
  src,
  className = "w-64 h-64",
  speaking = false,
  mouthOpen = 0,
  headX = 0.5,
  headY = 0.5,
  blinkNow = false,
  mood = 0,
}: {
  src: string;
  className?: string;
  speaking?: boolean;
  mouthOpen?: number; // 0..1
  headX?: number;     // 0..1
  headY?: number;     // 0..1
  blinkNow?: boolean;
  mood?: 0|1|2;
}) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: MACHINE,
    autoplay: true,
    layout: new (class { fit = Fit.Contain; alignment = Alignment.Center; })() as any,
  });

  const smSpeaking = useStateMachineInput(rive, MACHINE, "isSpeaking");
  const smBlink    = useStateMachineInput(rive, MACHINE, "blink");
  const smHeadX    = useStateMachineInput(rive, MACHINE, "headX");
  const smHeadY    = useStateMachineInput(rive, MACHINE, "headY");
  const smMouth    = useStateMachineInput(rive, MACHINE, "mouthOpen");
  const smMood     = useStateMachineInput(rive, MACHINE, "mood");

  useEffect(() => { if (smSpeaking) smSpeaking.value = speaking; }, [smSpeaking, speaking]);
  useEffect(() => { if (smMouth) smMouth.value = clamp01(mouthOpen); }, [smMouth, mouthOpen]);
  useEffect(() => { if (smHeadX) smHeadX.value = clamp01(headX); if (smHeadY) smHeadY.value = clamp01(headY); }, [smHeadX, smHeadY, headX, headY]);
  useEffect(() => { if (smMood && typeof mood === "number") smMood.value = mood; }, [smMood, mood]);

  const fired = useRef(false);
  useEffect(() => {
    if (smBlink && blinkNow && !fired.current) { smBlink.fire(); fired.current = true; }
    if (!blinkNow) fired.current = false;
  }, [blinkNow, smBlink]);

  return <RiveComponent className={className} />;
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }





