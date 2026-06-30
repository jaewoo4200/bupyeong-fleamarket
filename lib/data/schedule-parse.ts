/**
 * 버스킹/근무자 "붙여넣기 가져오기" — 텍스트 전용 처리.
 *
 * 흐름: 운영자가 사진을 자신이 쓰는 AI(ChatGPT/Claude 등)에 우리가 제공하는 프롬프트와 함께
 * 넣으면, AI가 아래 구조화 텍스트를 출력한다. 운영자는 그 텍스트를 관리자 페이지에 붙여넣고,
 * 우리 서비스는 OCR/AI 호출 없이 텍스트만 파싱한다.
 *
 * 형식
 *  - 버스킹:  날짜 | 시간 | 공연명 | 공연자 | 연락처
 *  - 근무자:  날짜 | 이름직책, 이름직책, ...   (직책은 이름 뒤 공백)
 *  - `#`로 시작하는 줄·빈 줄은 무시. 날짜는 YYYY-MM-DD 권장(M/D, M월 D일 등도 허용).
 */
import type { BuskingEntry, StaffEntry } from "./types";

let _seq = 0;
function rid(prefix: string): string {
  _seq += 1;
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${r}${_seq}`;
}

export type ParseIssue = { line: number; raw: string; message: string };
export type ParseResult<T> = { entries: T[]; issues: ParseIssue[]; dates: string[] };

export type ParseOpts = {
  /** M/D·일자만 적힌 경우 보충할 기준 연도 */
  defaultYear?: number;
  /** 일자만 적힌 경우 보충할 기준 월(1~12) */
  defaultMonth?: number;
};

/** 다양한 날짜 표기를 YYYY-MM-DD로 정규화. 실패 시 null. */
export function normalizeDate(raw: string, opts: ParseOpts = {}): string | null {
  let s = raw.trim();
  if (!s) return null;
  // 끝에 붙은 요일 표기 제거(달력 캡처에 흔함): "(토)"·"(일)" 또는 공백+요일.
  // 단, "7일"의 '일'과 충돌하지 않도록 괄호 없는 형태에서는 '일'은 제외.
  s = s.replace(/\s*\([월화수목금토일]\)\s*$/u, "").replace(/\s+[월화수목금토](?:요일)?\s*$/u, "").trim();
  if (!s) return null;
  let y: number | undefined, mo: number | undefined, d: number | undefined;

  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if ((m = s.match(/^(\d{1,2})\s*[.\-/]\s*(\d{1,2})$/))) {
    mo = +m[1]; d = +m[2];
  } else if ((m = s.match(/(\d{4})\s*년/)) && /(\d{1,2})\s*월/.test(s) && /(\d{1,2})\s*일/.test(s)) {
    y = +m[1]; mo = +s.match(/(\d{1,2})\s*월/)![1]; d = +s.match(/(\d{1,2})\s*일/)![1];
  } else if (/(\d{1,2})\s*월/.test(s) && /(\d{1,2})\s*일/.test(s)) {
    mo = +s.match(/(\d{1,2})\s*월/)![1]; d = +s.match(/(\d{1,2})\s*일/)![1];
  } else if ((m = s.match(/^(\d{1,2})\s*일?$/))) {
    d = +m[1];
  } else {
    return null;
  }

  y ??= opts.defaultYear;
  mo ??= opts.defaultMonth;
  if (y == null || mo == null || d == null) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // 실제 달력 검증(예: 2026-02-30, 2026-06-31 같은 존재하지 않는 날짜 거부)
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** `#`/빈 줄 제거 후 `|`로 분할한 데이터 줄들을 (원본 줄번호와 함께) 돌려준다. */
function dataLines(text: string): { line: number; cells: string[]; raw: string }[] {
  return text
    .split(/\r?\n/)
    .map((raw, i) => ({ raw, line: i + 1 }))
    .filter((l) => l.raw.trim() && !l.raw.trim().startsWith("#"))
    .map((l) => ({ ...l, cells: l.raw.split("|").map((c) => c.trim()) }));
}

const HEADER_HINT = /^(날짜|date)$/i; // 첫 칸이 정확히 "날짜"/"date"인 머리글 줄만 건너뛰기

export function parseBuskingText(text: string, opts: ParseOpts = {}): ParseResult<BuskingEntry> {
  const entries: BuskingEntry[] = [];
  const issues: ParseIssue[] = [];
  for (const { line, cells, raw } of dataLines(text)) {
    const date = normalizeDate(cells[0] ?? "", opts);
    if (!date) {
      // 첫 칸이 날짜가 아닌 머리글 줄은 조용히 건너뜀
      if (HEADER_HINT.test(cells[0] ?? "")) continue;
      issues.push({ line, raw, message: `날짜를 알 수 없습니다: "${cells[0] ?? ""}"` });
      continue;
    }
    const title = (cells[2] ?? "").trim();
    const time = (cells[1] ?? "").trim();
    if (!title && !time) {
      issues.push({ line, raw, message: "공연명/시간이 비어 있습니다." });
      continue;
    }
    entries.push({
      id: rid("bsk_"),
      date,
      time: time || undefined,
      title: title || "공연",
      performer: (cells[3] ?? "").trim() || undefined,
      contact: (cells[4] ?? "").trim() || undefined,
    });
  }
  return { entries, issues, dates: [...new Set(entries.map((e) => e.date))] };
}

/** "안재훈 부장" → {name:"안재훈", role:"부장"} · "총무님" → {name:"총무님"} */
export function parseStaffName(token: string): { name: string; role?: string } | null {
  const t = token.trim();
  if (!t) return null;
  const sp = t.indexOf(" ");
  if (sp === -1) return { name: t };
  return { name: t.slice(0, sp).trim(), role: t.slice(sp + 1).trim() || undefined };
}

export function parseStaffText(text: string, opts: ParseOpts = {}): ParseResult<StaffEntry> {
  const entries: StaffEntry[] = [];
  const issues: ParseIssue[] = [];
  for (const { line, cells, raw } of dataLines(text)) {
    const date = normalizeDate(cells[0] ?? "", opts);
    if (!date) {
      if (HEADER_HINT.test(cells[0] ?? "")) continue;
      issues.push({ line, raw, message: `날짜를 알 수 없습니다: "${cells[0] ?? ""}"` });
      continue;
    }
    // 근무자는 쉼표 구분이 기본이나, AI가 버스킹 프롬프트의 | 구분을 따라 할 수 있어 |도 함께 분리
    const people = cells
      .slice(1)
      .flatMap((c) => c.split(/[,،、|]/))
      .map((p) => parseStaffName(p))
      .filter((p): p is { name: string; role?: string } => !!p);
    if (people.length === 0) {
      issues.push({ line, raw, message: "근무자 이름이 비어 있습니다." });
      continue;
    }
    for (const p of people) entries.push({ id: rid("stf_"), date, name: p.name, role: p.role });
  }
  return { entries, issues, dates: [...new Set(entries.map((e) => e.date))] };
}

/** 가져온 항목의 날짜에 해당하는 기존 항목을 교체(다른 날짜는 보존)하고 날짜·시간순 정렬. */
export function upsertByDate<T extends { date: string }>(existing: T[], incoming: T[]): T[] {
  const dates = new Set(incoming.map((e) => e.date));
  const merged = [...existing.filter((e) => !dates.has(e.date)), ...incoming];
  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

/* ── 사용자에게 제공할 "복붙용" 프롬프트 (사진과 함께 자신의 AI에 입력) ── */

export const BUSKING_PROMPT = `첨부한 사진은 부평 문화의거리 "버스킹(공연) 일정표"입니다.
사진 속 모든 일정을 아래 형식으로, 한 줄에 하나씩만 출력하세요. 설명·머리말·코드블록 없이 데이터 줄만 출력합니다.

형식:  날짜 | 시간 | 공연명 | 공연자 | 연락처
규칙:
- 날짜는 반드시 YYYY-MM-DD (예: 2026-06-07)
- 값이 없는 칸은 비워 두되 | 구분자는 유지 (예: 2026-06-15 | 13:00~13:30 | 해군 군악대 | | )
- 시간은 "18:00~20:00" 형태, 끝 시간이 없으면 "18:00~"

예시:
2026-06-07 | 17:30~19:30 | 보컬그룹(3인) 발라드 | 민재봉 | 010-2418-9497
2026-06-15 | 13:00~13:30 | 해군 군악대 행사 | | `;

export const STAFF_PROMPT = `첨부한 사진은 부평 문화의거리 플리마켓 "근무표(달력 형태)"입니다.
근무자가 적힌 날짜만, 아래 형식으로 한 줄에 하나씩 출력하세요. 설명·머리말·코드블록 없이 데이터 줄만 출력합니다.

형식:  날짜 | 근무자목록
규칙:
- 날짜는 반드시 YYYY-MM-DD (예: 2026-06-03)
- 근무자는 쉼표(,)로 구분
- 직책이 있으면 이름 뒤에 한 칸 띄우고 적기 (예: 안재훈 부장), 없으면 이름만 (예: 총무님)

예시:
2026-06-03 | 안재훈 부장, 신철용 대리, 이재원
2026-06-06 | 총무님, 이재우, 김태섭`;
