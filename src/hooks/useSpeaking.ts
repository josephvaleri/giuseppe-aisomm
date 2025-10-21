"use client";
import { useEffect, useState } from "react";

export function useSpeaking(threshold = 0.055) {
  const [speaking, setSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  useEffect(() => {
    let ctx: AudioContext | undefined, raf = 0, an: AnalyserNode | undefined;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an!.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        setSpeaking(rms > threshold);
        setMouthOpen(Math.min(1, rms * 8));
        raf = requestAnimationFrame(loop);
      };
      loop();
    }).catch(() => {});
    return () => { if (raf) cancelAnimationFrame(raf); if (ctx && ctx.state !== "closed") ctx.close(); };
  }, [threshold]);

  return { speaking, mouthOpen };
}









