import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseStaffText,
  parseBuskingText,
  parseStaffName,
  normalizeDate,
  upsertByDate,
} from "@/lib/data/schedule-parse";

test("normalizeDate: 다양한 표기 → ISO", () => {
  assert.equal(normalizeDate("2026-06-07"), "2026-06-07");
  assert.equal(normalizeDate("2026.6.7"), "2026-06-07");
  assert.equal(normalizeDate("6/3", { defaultYear: 2026 }), "2026-06-03");
  assert.equal(normalizeDate("6월 7일", { defaultYear: 2026 }), "2026-06-07");
  assert.equal(normalizeDate("3", { defaultYear: 2026, defaultMonth: 6 }), "2026-06-03");
  assert.equal(normalizeDate("아무말"), null);
  assert.equal(normalizeDate("13/40", { defaultYear: 2026 }), null); // 범위 밖
});

test("normalizeDate: 요일 접미사 제거 + 달력 검증", () => {
  // 달력 캡처에 흔한 요일 표기를 모든 표기에서 일관되게 허용
  assert.equal(normalizeDate("2026-06-07 (일)"), "2026-06-07");
  assert.equal(normalizeDate("6/7 (토)", { defaultYear: 2026 }), "2026-06-07");
  assert.equal(normalizeDate("6/7 토", { defaultYear: 2026 }), "2026-06-07");
  assert.equal(normalizeDate("6월 7일 (토)", { defaultYear: 2026 }), "2026-06-07");
  assert.equal(normalizeDate("6월 7일", { defaultYear: 2026 }), "2026-06-07"); // '일'과 충돌 안 함
  // 존재하지 않는 날짜 거부
  assert.equal(normalizeDate("2026-02-30"), null);
  assert.equal(normalizeDate("2026-06-31"), null);
});

test("parseStaffText: AI가 |로 근무자를 구분해도 분리", () => {
  const { entries, issues } = parseStaffText("2026-06-03 | 안재훈 부장 | 신철용 대리 | 이재원");
  assert.equal(issues.length, 0);
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map((e) => e.name), ["안재훈", "신철용", "이재원"]);
  assert.equal(entries[0].role, "부장");
  assert.equal(entries[2].role, undefined);
});

test("parseStaffName: 이름/직책 분리", () => {
  assert.deepEqual(parseStaffName("안재훈 부장"), { name: "안재훈", role: "부장" });
  assert.deepEqual(parseStaffName("총무님"), { name: "총무님" });
  assert.equal(parseStaffName("   "), null);
});

test("parseStaffText: 6월 근무표(AI 출력 형식)을 파싱한다", () => {
  // 머리글·주석·빈 줄을 섞어 견고성 확인
  const input = `# 2026년 6월 근무표
날짜 | 근무자
2026-06-03 | 안재훈 부장, 신철용 대리, 이재원

2026-06-06 | 총무님, 이재우, 서제우
2026-06-07 | 총무님, 임상민, 김태섭`;
  const { entries, issues, dates } = parseStaffText(input);
  assert.equal(issues.length, 0, JSON.stringify(issues));
  assert.deepEqual(dates, ["2026-06-03", "2026-06-06", "2026-06-07"]);
  assert.equal(entries.length, 9);
  assert.deepEqual(
    { date: entries[0].date, name: entries[0].name, role: entries[0].role },
    { date: "2026-06-03", name: "안재훈", role: "부장" },
  );
  const chongmu = entries.find((e) => e.name === "총무님");
  assert.ok(chongmu && chongmu.role === undefined, "직책 없는 이름은 role 미설정");
  assert.ok(entries.every((e) => e.id), "각 항목에 id 부여");
});

test("parseStaffText: M/D + 기준연월 보충", () => {
  const { entries, issues } = parseStaffText("6/13 | 총무님, 임상민", {
    defaultYear: 2026,
    defaultMonth: 6,
  });
  assert.equal(issues.length, 0);
  assert.equal(entries[0].date, "2026-06-13");
  assert.equal(entries.length, 2);
});

test("parseStaffText: 잘못된 줄은 issue로 보고", () => {
  const { entries, issues } = parseStaffText("없는날짜 | 홍길동\n2026-06-03 | 김철수");
  assert.equal(entries.length, 1);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].line, 1);
});

test("parseBuskingText: 날짜|시간|공연명|공연자|연락처", () => {
  const input = `2026-06-07 | 17:30~19:30 | 보컬그룹(3인) 발라드 | 민재봉 | 010-2418-9497
2026-06-15 | 13:00~13:30 | 해군 군악대 행사 | | `;
  const { entries, issues } = parseBuskingText(input);
  assert.equal(issues.length, 0);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    {
      date: entries[0].date,
      time: entries[0].time,
      title: entries[0].title,
      performer: entries[0].performer,
      contact: entries[0].contact,
    },
    {
      date: "2026-06-07",
      time: "17:30~19:30",
      title: "보컬그룹(3인) 발라드",
      performer: "민재봉",
      contact: "010-2418-9497",
    },
  );
  // 빈 칸은 undefined
  assert.equal(entries[1].performer, undefined);
  assert.equal(entries[1].contact, undefined);
  assert.equal(entries[1].title, "해군 군악대 행사");
});

test("parseBuskingText: 공연명·시간이 모두 비면 issue", () => {
  const { entries, issues } = parseBuskingText("2026-06-09 | | | |");
  assert.equal(entries.length, 0);
  assert.equal(issues.length, 1);
});

test("upsertByDate: 같은 날짜만 교체하고 정렬", () => {
  const existing = [
    { date: "2026-06-03", name: "old" },
    { date: "2026-07-01", name: "keep" },
  ];
  const incoming = [{ date: "2026-06-03", name: "new" }];
  const merged = upsertByDate(existing, incoming);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((m) => m.date), ["2026-06-03", "2026-07-01"]);
  assert.equal(merged.find((m) => m.date === "2026-06-03")!.name, "new"); // 교체됨
});
