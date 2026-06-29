import type { EventConfig } from "@/lib/data/types";
import { effectiveSeats } from "@/lib/venue/seats";

/** 오늘 추첨 가능한(활성) 좌석 코드 목록 — 결합석 분리·커스텀 좌석 반영, 비활성 제외 */
export function activeSeatCodes(event: EventConfig): string[] {
  const inactive = new Set(event.inactiveSeatCodes);
  return effectiveSeats(event)
    .filter((s) => !inactive.has(s.code))
    .map((s) => s.code);
}

/**
 * 후보 좌석 중 하나를 무작위로 고른다.
 * @param rand 0~1 난수 생성기 (테스트 주입용)
 */
export function pickSeat(opts: {
  candidateCodes: string[];
  rand?: () => number;
}): { seatCode: string | null } {
  const rand = opts.rand ?? Math.random;
  if (opts.candidateCodes.length === 0) return { seatCode: null };
  return { seatCode: opts.candidateCodes[Math.floor(rand() * opts.candidateCodes.length)] };
}
