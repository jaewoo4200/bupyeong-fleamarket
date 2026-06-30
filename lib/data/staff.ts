/**
 * 근무표 헬퍼 + 데모 시드.
 * 데이터는 전역(AppData.staff)에 저장되고 관리자 페이지에서 붙여넣기 가져오기/편집한다.
 * 행사 당일 근무자를 운영자 화면에 표시.
 */
import type { StaffEntry } from "./types";

export type { StaffEntry };

/** 날짜별 근무자 정의를 1명 1행으로 펼쳐 시드 배열로 만든다(고정 id). */
function expand(seed: Record<string, [string, string?][]>): StaffEntry[] {
  const out: StaffEntry[] = [];
  for (const [date, people] of Object.entries(seed)) {
    people.forEach(([name, role], i) => {
      out.push({ id: `stf_${date}_${i}`, date, name, role });
    });
  }
  return out;
}

/** 데모 시드: 2026년 7월 부평문화의거리 프리마켓 근무표 (6월은 가져오기 테스트용으로 비워 둠) */
export const SEED_STAFF: StaffEntry[] = expand({
  "2026-07-03": [["안재훈", "부장"], ["신철용", "대리"], ["송원규", "사원"]],
  "2026-07-04": [["총무님"], ["이재원"], ["서제우"]],
  "2026-07-05": [["총무님"], ["이재우"], ["선남이"]],
  "2026-07-10": [["배태욱", "대리"], ["선남이"], ["백유빈"]],
  "2026-07-11": [["총무님"], ["임상민"], ["서제우"]],
  "2026-07-12": [["총무님"], ["이재우"], ["김태섭"]],
  "2026-07-17": [["안재훈", "부장"], ["신철용", "대리"], ["송원규", "사원"]],
  "2026-07-18": [["총무님"], ["임상민"], ["김태섭"]],
  "2026-07-19": [["총무님"], ["이재우"], ["백유빈"]],
  "2026-07-24": [["안재훈", "부장"], ["신철용", "대리"], ["송원규", "사원"]],
  "2026-07-25": [["총무님"], ["임상민"], ["선남이"]],
  "2026-07-26": [["총무님"], ["이재원"], ["백유빈"]],
  "2026-07-31": [["안재훈", "부장"], ["신철용", "대리"], ["송원규", "사원"]],
});

export function staffForDate(entries: StaffEntry[], date: string | undefined): StaffEntry[] {
  if (!date) return [];
  return entries.filter((m) => m.date === date);
}
