import { SEATS, LANDMARKS } from "./venue-layout";

export type Bounds = { x: number; y: number; w: number; h: number };

function bbox(items: { x: number; y: number; w: number; h: number }[]): Bounds {
  const x0 = Math.min(...items.map((i) => i.x));
  const y0 = Math.min(...items.map((i) => i.y));
  const x1 = Math.max(...items.map((i) => i.x + i.w));
  const y1 = Math.max(...items.map((i) => i.y + i.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** 실제로 그릴 랜드마크: 원본 엑셀의 건물명/상가명/구조물 전체를 복구해서 표시한다. */
export const VISIBLE_LANDMARKS = LANDMARKS;

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
