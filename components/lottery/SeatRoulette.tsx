"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_SEAT_CODES } from "@/lib/venue/venue-layout";

/**
 * 추첨 룰렛 — running 동안 좌석 번호가 빠르게 바뀌다가 final에서 멈춘다.
 */
export function SeatRoulette({
  running,
  final,
  className,
}: {
  running: boolean;
  final: string | null;
  className?: string;
}) {
  const [display, setDisplay] = useState<string>(final ?? "?");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => {
        setDisplay(ALL_SEAT_CODES[Math.floor(Math.random() * ALL_SEAT_CODES.length)]);
      }, 70);
    } else {
      if (timer.current) clearInterval(timer.current);
      if (final) setDisplay(final);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, final]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}
