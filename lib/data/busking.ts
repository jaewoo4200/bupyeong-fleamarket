/**
 * 버스킹(공연) 일정 헬퍼 + 데모 시드.
 * 데이터는 전역(AppData.busking)에 저장되고 관리자 페이지에서 붙여넣기 가져오기/편집한다.
 * 일정이 있는 날은 운영자에게 알림 + 무대 앞 좌석 제외를 제안한다.
 */
import type { BuskingEntry } from "./types";

export type { BuskingEntry };

/** 데모 시드: 2026년 6월 — 부평 문화의거리 공연신청현황 (고정 id로 결정적 시드) */
export const SEED_BUSKING: BuskingEntry[] = [
  { id: "bsk_s01", date: "2026-06-03", time: "18:00~20:00", title: "뮤지컬 공연", performer: "여성환", contact: "010-9846-2476" },
  { id: "bsk_s02", date: "2026-06-05", time: "16:00~18:00", title: "성악+보컬+힙합 (3명)", performer: "양준성", contact: "010-3477-9386" },
  { id: "bsk_s03", date: "2026-06-06", time: "17:00~18:00", title: "남녀 혼성 듀엣", performer: "김정태 (여운)", contact: "010-4031-7328" },
  { id: "bsk_s04", date: "2026-06-07", time: "17:30~19:30", title: "보컬그룹 (3인) · 발라드", performer: "민재봉", contact: "010-2418-9497" },
  { id: "bsk_s05", date: "2026-06-14", time: "17:00~19:00", title: "발라드 보컬 (4~5명)", performer: "림보 (임미현)", contact: "010-4782-9665" },
  { id: "bsk_s06", date: "2026-06-15", time: "13:00~13:30", title: "해군 군악대 행사" },
  { id: "bsk_s07", date: "2026-06-20", time: "18:00~19:00", title: "통기타 라이브", performer: "김도영", contact: "010-8626-2667" },
  { id: "bsk_s08", date: "2026-06-26", time: "15:00~17:00", title: "공연 (통기타+하모니카)", performer: "부평구 평생학습관", contact: "032-509-6435" },
  { id: "bsk_s09", date: "2026-06-27", time: "18:00~", title: "무대: 부평구르네상스센터" },
  { id: "bsk_s10", date: "2026-06-27", time: "20:00~21:00", title: "평식당: 보컬그룹(3인) 발라드", performer: "민재봉", contact: "010-2418-9497" },
];

/** 버스킹 시 무대 앞 양쪽 3석씩 제외 권장 (중앙무대 인접) */
export const STAGE_FRONT_SEATS = ["27", "28", "29", "57", "58", "59"];

export function buskingForDate(entries: BuskingEntry[], date: string | undefined): BuskingEntry[] {
  if (!date) return [];
  return entries
    .filter((b) => b.date === date)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}
