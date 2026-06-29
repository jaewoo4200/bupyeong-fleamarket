/**
 * 근무표 (데모: 2026년 7월 부평문화의거리 프리마켓 근무표).
 * 행사 당일 근무자를 운영자 화면에 표시.
 */
export type StaffMember = { name: string; role?: string };

export const STAFF_SCHEDULE: Record<string, StaffMember[]> = {
  "2026-07-03": [{ name: "안재훈", role: "부장" }, { name: "신철용", role: "대리" }, { name: "송원규", role: "사원" }],
  "2026-07-04": [{ name: "총무님" }, { name: "이재원" }, { name: "서제우" }],
  "2026-07-05": [{ name: "총무님" }, { name: "이재우" }, { name: "선남이" }],
  "2026-07-10": [{ name: "배태욱", role: "대리" }, { name: "선남이" }, { name: "백유빈" }],
  "2026-07-11": [{ name: "총무님" }, { name: "임상민" }, { name: "서제우" }],
  "2026-07-12": [{ name: "총무님" }, { name: "이재우" }, { name: "김태섭" }],
  "2026-07-17": [{ name: "안재훈", role: "부장" }, { name: "신철용", role: "대리" }, { name: "송원규", role: "사원" }],
  "2026-07-18": [{ name: "총무님" }, { name: "임상민" }, { name: "김태섭" }],
  "2026-07-19": [{ name: "총무님" }, { name: "이재우" }, { name: "백유빈" }],
  "2026-07-24": [{ name: "안재훈", role: "부장" }, { name: "신철용", role: "대리" }, { name: "송원규", role: "사원" }],
  "2026-07-25": [{ name: "총무님" }, { name: "임상민" }, { name: "선남이" }],
  "2026-07-26": [{ name: "총무님" }, { name: "이재원" }, { name: "백유빈" }],
  "2026-07-31": [{ name: "안재훈", role: "부장" }, { name: "신철용", role: "대리" }, { name: "송원규", role: "사원" }],
};

export function staffForDate(date: string | undefined): StaffMember[] {
  if (!date) return [];
  return STAFF_SCHEDULE[date] ?? [];
}
