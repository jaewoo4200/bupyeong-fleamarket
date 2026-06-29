import { SEATS, LANDMARKS, type LandmarkGeo } from "./venue-layout";

const SEAT_BY_CODE = new Map(SEATS.map((s) => [s.code, s]));

function center(b: { x: number; y: number; w: number; h: number }) {
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
}
function dist(a: { cx: number; cy: number }, b: { cx: number; cy: number }) {
  return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

const ANCHOR_KINDS = new Set(["stage", "fountain", "entrance"]);

export type SeatDirections = {
  band: 1 | 2;
  bandLabel: string;
  nearestStore?: string;
  anchor?: { label: string; direction: string };
  text: string;
};

/**
 * 좌석 코드 → 랜드마크 기반 길안내(텍스트).
 * 기능 6-A: GPS 없이 "어디 앞, 어느 방향" 안내.
 */
export function seatDirections(code: string): SeatDirections | null {
  const seat = SEAT_BY_CODE.get(code);
  if (!seat) return null;
  const sc = center(seat);
  const bandLm = LANDMARKS.filter((l) => l.band === seat.band);

  const stores = bandLm.filter((l) => l.kind === "store");
  const nearestStore = nearest(stores, sc);

  const anchors = bandLm.filter((l) => ANCHOR_KINDS.has(l.kind));
  const nearestAnchor = nearest(anchors, sc);

  const bandLabel = seat.band === 1 ? "윗구간" : "아랫구간";
  let anchor: SeatDirections["anchor"];
  if (nearestAnchor) {
    const ac = center(nearestAnchor);
    const dx = ac.cx - sc.cx;
    const dy = ac.cy - sc.cy;
    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "오른쪽"
          : "왼쪽"
        : dy > 0
          ? "아래쪽"
          : "위쪽";
    anchor = { label: cleanLabel(nearestAnchor.label), direction: dir };
  }

  const parts = [bandLabel];
  if (nearestStore) parts.push(`${cleanLabel(nearestStore.label)} 매장 앞`);
  if (anchor) parts.push(`${anchor.label} ${anchor.direction} 방향`);
  const text = parts.join(" · ") + ` (${seat.label}번)`;

  return {
    band: seat.band,
    bandLabel,
    nearestStore: nearestStore ? cleanLabel(nearestStore.label) : undefined,
    anchor,
    text,
  };
}

function nearest(list: LandmarkGeo[], from: { cx: number; cy: number }): LandmarkGeo | undefined {
  let best: LandmarkGeo | undefined;
  let bestD = Infinity;
  for (const l of list) {
    const d = dist(center(l), from);
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
}

function cleanLabel(s: string): string {
  return s.replace(/·/g, "").replace(/\s+/g, " ").trim();
}
