import { SEATS, LANDMARKS } from "./venue-layout";

export type Bounds = { x: number; y: number; w: number; h: number };

function bbox(items: { x: number; y: number; w: number; h: number }[]): Bounds {
  const x0 = Math.min(...items.map((i) => i.x));
  const y0 = Math.min(...items.map((i) => i.y));
  const x1 = Math.max(...items.map((i) => i.x + i.w));
  const y1 = Math.max(...items.map((i) => i.y + i.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** 각 밴드 좌석들의 세로 범위 */
function seatYSpan(band: number): { ymin: number; ymax: number } {
  const bs = SEATS.filter((s) => s.band === band);
  return { ymin: Math.min(...bs.map((s) => s.y)), ymax: Math.max(...bs.map((s) => s.y + s.h)) };
}

/**
 * 좌석 세로 범위와 겹치는 랜드마크만 표시한다.
 * → 좌석 줄 위/아래의 주변 상가·바깥쪽 구조물(아랫구간 맨 아래 떼구루·블링블링·포장마차·문화의거리입구 등)은
 *   배치도에서 아예 제외(요청: "아예 안뜨게"). 좌석 사이의 운영 구조물(중앙무대·분수대·배전반 등)만 남는다.
 */
function inSeatSpan(l: { y: number; h: number; band: number }): boolean {
  const { ymin, ymax } = seatYSpan(l.band);
  return l.y < ymax && l.y + l.h > ymin;
}

/** 실제로 그릴 랜드마크 (좌석 줄과 겹치는 것만) */
export const VISIBLE_LANDMARKS = LANDMARKS.filter(inSeatSpan);

const kept = [...SEATS, ...VISIBLE_LANDMARKS];

export const BAND1_BOUNDS = bbox(kept.filter((i) => i.band === 1));
export const BAND2_BOUNDS = bbox(kept.filter((i) => i.band === 2));
export const FULL_BOUNDS: Bounds = bbox(kept);

export function boundsFor(view: "all" | "band1" | "band2"): Bounds {
  return view === "band1" ? BAND1_BOUNDS : view === "band2" ? BAND2_BOUNDS : FULL_BOUNDS;
}

/** Padded viewBox string for a bounds. */
export function viewBoxStr(b: Bounds, pad = 6): string {
  return `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
}

export function aspectFor(view: "all" | "band1" | "band2", pad = 6): number {
  const b = boundsFor(view);
  return (b.w + pad * 2) / (b.h + pad * 2);
}
