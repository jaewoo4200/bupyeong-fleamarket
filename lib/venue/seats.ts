import { SEATS, type SeatGeo } from "./venue-layout";
import type { EventConfig } from "@/lib/data/types";

/** 결합석 여부 (라벨에 콤마 → 2매대 붙임석) */
export function isComboSeat(code: string): boolean {
  return code.includes(",");
}

/** 결합석 코드 → 단독석 코드 2개 (예: "8, 8-1" → ["8","8-1"]) */
export function splitParts(code: string): string[] {
  return code.split(",").map((s) => s.trim());
}

export const COMBO_SEATS = SEATS.filter((s) => isComboSeat(s.code));

/** 결합석을 좌/우 2개 단독석 SeatGeo로 분리 */
export function splitGeometry(seat: SeatGeo): SeatGeo[] {
  const parts = splitParts(seat.code);
  const gap = Math.min(0.8, seat.w * 0.04);
  const half = (seat.w - gap) / parts.length;
  return parts.map((p, i) => ({
    ...seat,
    code: p,
    label: p,
    num: parseInt(p, 10) || seat.num,
    x: seat.x + i * (half + gap),
    w: half,
  }));
}

/**
 * 행사 설정을 반영한 "유효 좌석" 목록.
 *  - splitSeatCodes 에 든 결합석은 단독석 2개로 분리
 *  - customSeats(임의 추가 좌석) 포함
 */
export function effectiveSeats(event?: EventConfig): SeatGeo[] {
  const split = new Set(event?.splitSeatCodes ?? []);
  const out: SeatGeo[] = [];
  for (const s of SEATS) {
    if (isComboSeat(s.code) && split.has(s.code)) out.push(...splitGeometry(s));
    else out.push(s);
  }
  for (const c of event?.customSeats ?? []) {
    out.push({ ...c, num: 9000 + out.length, woodCapable: false });
  }
  return out;
}

export function effectiveSeatCodes(event?: EventConfig): string[] {
  return effectiveSeats(event).map((s) => s.code);
}
