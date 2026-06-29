/**
 * 월별 버스킹(공연) 일정. (데모: 2026년 6월 — 부평 문화의거리 공연신청현황)
 * 일정이 있는 날은 운영자에게 알림 + 무대 앞 좌석 제외를 제안한다.
 */
export type BuskingEvent = {
  date: string; // YYYY-MM-DD
  title: string;
  performer?: string;
  contact?: string;
  time: string;
  desc?: string;
};

export const BUSKING_SCHEDULE: BuskingEvent[] = [
  { date: "2026-06-03", title: "뮤지컬 공연", performer: "여성환", contact: "010-9846-2476", time: "18:00~20:00" },
  { date: "2026-06-05", title: "성악+보컬+힙합 (3명)", performer: "양준성", contact: "010-3477-9386", time: "16:00~18:00" },
  { date: "2026-06-06", title: "남녀 혼성 듀엣", performer: "김정태 (여운)", contact: "010-4031-7328", time: "17:00~18:00" },
  { date: "2026-06-07", title: "보컬그룹 (3인) · 발라드", performer: "민재봉", contact: "010-2418-9497", time: "17:30~19:30" },
  { date: "2026-06-14", title: "발라드 보컬 (4~5명)", performer: "림보 (임미현)", contact: "010-4782-9665", time: "17:00~19:00" },
  { date: "2026-06-15", title: "해군 군악대 행사", time: "13:00~13:30" },
  { date: "2026-06-20", title: "통기타 라이브", performer: "김도영", contact: "010-8626-2667", time: "18:00~19:00" },
  { date: "2026-06-26", title: "공연 (통기타+하모니카)", performer: "부평구 평생학습관", contact: "032-509-6435", time: "15:00~17:00" },
  { date: "2026-06-27", title: "무대: 부평구르네상스센터", time: "18:00~" },
  { date: "2026-06-27", title: "평식당: 보컬그룹(3인) 발라드", performer: "민재봉", contact: "010-2418-9497", time: "20:00~21:00" },
];

/** 버스킹 시 무대 앞 양쪽 3석씩 제외 권장 (중앙무대 인접) */
export const STAGE_FRONT_SEATS = ["27", "28", "29", "57", "58", "59"];

export function buskingForDate(date: string | undefined): BuskingEvent[] {
  if (!date) return [];
  return BUSKING_SCHEDULE.filter((b) => b.date === date);
}
