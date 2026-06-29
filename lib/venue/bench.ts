import type { SeatPalette } from "./venue-layout";

/**
 * 엑셀 좌석 박스 색(빨강/파랑) = 벤치(의자) 유무 구분.
 * 어느 색이 "벤치 비치(의자 지급 불필요)"인지는 운영팀 확인값으로 설정한다.
 * (red = FFFF0000, blue = FF00B0F0)
 */
// 운영팀 확인: 빨강 = 벤치 있음(의자 지급 불필요), 파랑 = 의자 지급 필요.
export const BENCH_COLOR: Exclude<SeatPalette, "none"> = "red";

export function seatHasBench(p: SeatPalette): boolean {
  return p === BENCH_COLOR;
}
/** 의자를 지급해야 하는 좌석(=벤치 없음) */
export function seatNeedsChair(p: SeatPalette): boolean {
  return p !== "none" && p !== BENCH_COLOR;
}

/** 박스 진한 색 (코너 표식용) — AA 대비 보정 */
export const BENCH_SOLID: Record<SeatPalette, string> = {
  red: "#e5392b",
  blue: "#1683c9",
  none: "#cdba9c",
};
/** 빈 좌석 배경 연한 틴트 */
export const BENCH_TINT: Record<SeatPalette, string> = {
  red: "#fdeae7",
  blue: "#e9f3fb",
  none: "#ffffff",
};

export function benchLabel(p: SeatPalette): string {
  if (p === "none") return "구분 없음";
  return seatHasBench(p) ? "의자 비치(벤치)" : "의자 지급 필요";
}
