"use client";
import { useEffect, useRef } from "react";

export function usePrevious<T>(v: T) {
  const r = useRef<T>(v);
  useEffect(() => { r.current = v; }, [v]);
  return r.current;
}
