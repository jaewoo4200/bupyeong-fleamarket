import type { AppData, EventConfig, Seller, Weekday } from "./types";
import { categorize } from "@/lib/venue/categories";
import { splitParts } from "@/lib/venue/seats";
import { SEED_SELLERS } from "./seed-sellers";
import { SEED_BUSKING } from "./busking";
import { SEED_STAFF } from "./staff";

export const STORAGE_KEY = "bupyeong-flea/v1";
export const CHANNEL = "bupyeong-flea";

export function uid(prefix = ""): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + r;
}

/** 안정적인 빈 스냅샷 (SSR/초기 렌더용 — 매번 새 객체를 반환하면 무한 루프) */
export const EMPTY_DATA: AppData = { events: [], sellers: [], draws: [], notes: [], busking: [], staff: [] };

/** 결합석 분리/붙임 토글 시, 해당 결합석 또는 그 단독석에 배정된 셀러인지 */
export function comboCodeMatches(comboCode: string, assignedSeat: string): boolean {
  return assignedSeat === comboCode || splitParts(comboCode).includes(assignedSeat);
}

/** 날짜(YYYY-MM-DD) → 요일. 금/일은 정확히, 그 외(주중 등)는 토로 기본 처리(플리마켓은 주말 운영). */
export function weekdayFromDate(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "토";
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 … 6=토
  return wd === 5 ? "금" : wd === 0 ? "일" : "토";
}

export function makeEvent(date: string, weekday: Weekday, name: string): EventConfig {
  return {
    id: uid("evt_"),
    date,
    weekday,
    eventType: "fleamarket",
    name,
    status: "lottery_open",
    countWood: 8,
    countTable: 72,
    countChair: 80,
    woodSeatCodes: [],
    inactiveSeatCodes: [],
    splitSeatCodes: [],
    customSeats: [],
  };
}

// 데모: 2매대(붙임석) 사용 셀러 예시 (실데이터는 엑셀 자동인식/명단 토글로 지정)
const DEMO_TWO_TABLE_SEQS = new Set([3, 38]);

export function seedSellersFor(eventId: string): Seller[] {
  return SEED_SELLERS.map((s) => ({
    id: uid("sel_"),
    eventId,
    seq: s.seq,
    business: s.business,
    name: s.name,
    productText: s.productText,
    categoryKey: categorize(s.productText),
    twoTables: DEMO_TWO_TABLE_SEQS.has(s.seq),
    assignedSeat: null,
    drawnAt: null,
  }));
}

/** 데모 시드: 7/4(토) 근무표 데모 + 6/7(일) 버스킹 데모 */
export function seedData(): AppData {
  const julEvent = makeEvent("2026-07-04", "토", "2026-07-04 (토) 플리마켓");
  const junEvent = makeEvent("2026-06-07", "일", "2026-06-07 (일) 플리마켓");
  const sellers = [...seedSellersFor(julEvent.id), ...seedSellersFor(junEvent.id)];
  const notes = [
    { id: uid("note_"), eventId: julEvent.id, text: "57~59 구간 의자 2개 추가 요청 (셀러 만달)", tag: "chair" as const, done: false, createdAt: "2026-07-04T08:30:00.000Z" },
    { id: uid("note_"), eventId: julEvent.id, text: "분수대 쪽 하수구 덮개 점검 필요", tag: "facility" as const, done: false, createdAt: "2026-07-04T08:40:00.000Z" },
  ];
  return {
    events: [julEvent, junEvent],
    sellers,
    draws: [],
    notes,
    busking: SEED_BUSKING, // 6월 버스킹 데모
    staff: SEED_STAFF, // 7월 근무표 데모 (6월 근무표는 가져오기 테스트용으로 비워 둠)
    currentEventId: julEvent.id,
  };
}

/** 저장된 데이터에 누락 필드를 채워 구버전 호환 (스키마 진화 대비) */
export function normalizeData(raw: unknown): AppData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<AppData>;
  const events = (Array.isArray(d.events) ? d.events : []).map((e) => ({
    ...e,
    woodSeatCodes: e.woodSeatCodes ?? [],
    inactiveSeatCodes: e.inactiveSeatCodes ?? [],
    splitSeatCodes: e.splitSeatCodes ?? [],
    customSeats: e.customSeats ?? [],
  })) as EventConfig[];
  return {
    events,
    sellers: Array.isArray(d.sellers) ? d.sellers : [],
    draws: Array.isArray(d.draws) ? d.draws : [],
    notes: Array.isArray(d.notes) ? d.notes : [],
    // 구버전 저장본엔 busking/staff가 없음 → 데모 시드로 backfill(최초 1회), 이후엔 저장된 값 사용
    busking: Array.isArray(d.busking) ? d.busking : SEED_BUSKING,
    staff: Array.isArray(d.staff) ? d.staff : SEED_STAFF,
    currentEventId: d.currentEventId,
  };
}
