"use client";

import type {
  AppData,
  DrawLog,
  DrawResult,
  EventConfig,
  EventType,
  Seller,
  Weekday,
} from "./types";
import { categorize } from "@/lib/venue/categories";
import { activeSeatCodes, pickSeat } from "@/lib/lottery/rules";
import { splitParts } from "@/lib/venue/seats";
import type { CustomSeat, Note } from "./types";
import { SEED_SELLERS } from "./seed-sellers";

/** 결합석 분리/붙임 토글 시, 해당 결합석 또는 그 단독석에 배정된 셀러인지 */
function comboCodeMatches(comboCode: string, assignedSeat: string): boolean {
  return assignedSeat === comboCode || splitParts(comboCode).includes(assignedSeat);
}

const STORAGE_KEY = "bupyeong-flea/v1";
const CHANNEL = "bupyeong-flea";

function uid(prefix = ""): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + r;
}

/** 안정적인 빈 스냅샷 (SSR/초기 렌더용 — 매번 새 객체를 반환하면 무한 루프) */
const EMPTY_DATA: AppData = { events: [], sellers: [], draws: [], notes: [] };

function emptyData(): AppData {
  return { events: [], sellers: [], draws: [], notes: [] };
}

/** 시드: 다가오는 토요일 플리마켓 1건 + 참가자리스트 40명 */
function makeEvent(date: string, weekday: Weekday, name: string): EventConfig {
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

function seedSellersFor(eventId: string): Seller[] {
  return SEED_SELLERS.map((s) => ({
    id: uid("sel_"),
    eventId,
    seq: s.seq,
    business: s.business,
    name: s.name,
    productText: s.productText,
    categoryKey: categorize(s.productText),
    assignedSeat: null,
    drawnAt: null,
  }));
}

function seedData(): AppData {
  // 7/4(토): 근무표 데모 / 6/7(일): 버스킹 일정 데모
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
    currentEventId: julEvent.id,
  };
}

export class DataStore {
  private data: AppData = EMPTY_DATA;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? (JSON.parse(raw) as AppData) : seedData();
      if (!this.data.notes) this.data.notes = []; // 구버전 저장 데이터 호환
      if (!raw) this.persist(false);
    } catch {
      this.data = seedData();
    }
    try {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = () => this.reloadFromStorage();
    } catch {
      /* no BroadcastChannel */
    }
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) this.reloadFromStorage();
    });
  }

  private reloadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = JSON.parse(raw) as AppData;
        if (!this.data.notes) this.data.notes = [];
        this.emit();
      }
    } catch {
      /* ignore */
    }
  }

  private persist(broadcast = true) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      if (broadcast) this.channel?.postMessage("update");
    } catch {
      /* ignore */
    }
  }

  private mutate(fn: (d: AppData) => AppData) {
    this.data = fn(structuredClone(this.data));
    this.persist();
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  // ---- React external store interface ----
  subscribe = (cb: () => void) => {
    this.init();
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getSnapshot = (): AppData => this.data;
  getServerSnapshot = (): AppData => EMPTY_DATA;

  // ---- selectors ----
  currentEvent(): EventConfig | undefined {
    return this.data.events.find((e) => e.id === this.data.currentEventId) ?? this.data.events[0];
  }
  sellersForEvent(eventId: string): Seller[] {
    return this.data.sellers.filter((s) => s.eventId === eventId).sort((a, b) => a.seq - b.seq);
  }
  drawsForEvent(eventId: string): DrawLog[] {
    return this.data.draws
      .filter((d) => d.eventId === eventId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  // ---- events ----
  createEvent(input: {
    date: string;
    weekday: Weekday;
    eventType: EventType;
    name?: string;
  }): string {
    const id = uid("evt_");
    const event: EventConfig = {
      id,
      date: input.date,
      weekday: input.weekday,
      eventType: input.eventType,
      name: input.name || `${input.date} (${input.weekday}) ${input.eventType === "bbday" ? "비비데이" : "플리마켓"}`,
      status: "draft",
      countWood: 0,
      countTable: 80,
      countChair: 80,
      woodSeatCodes: [],
      inactiveSeatCodes: [],
      splitSeatCodes: [],
      customSeats: [],
    };
    this.mutate((d) => ({ ...d, events: [...d.events, event], currentEventId: id }));
    return id;
  }

  updateEvent(id: string, patch: Partial<EventConfig>) {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  setCurrentEvent(id: string) {
    this.mutate((d) => ({ ...d, currentEventId: id }));
  }

  // ---- sellers ----
  importSellers(
    eventId: string,
    rows: { seq: number; business: string; name: string; productText: string; phone?: string }[],
  ) {
    const sellers: Seller[] = rows.map((r) => ({
      id: uid("sel_"),
      eventId,
      seq: r.seq,
      business: r.business,
      name: r.name,
      productText: r.productText,
      categoryKey: categorize(r.productText),
      phone: r.phone,
      assignedSeat: null,
      drawnAt: null,
    }));
    this.mutate((d) => ({
      ...d,
      sellers: [...d.sellers.filter((s) => s.eventId !== eventId), ...sellers],
      draws: d.draws.filter((dr) => dr.eventId !== eventId),
    }));
  }

  // ---- lottery ----
  drawSeat(eventId: string, sellerId: string, rand?: () => number): DrawResult {
    const event = this.data.events.find((e) => e.id === eventId);
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!event || !seller) throw new Error("행사 또는 셀러를 찾을 수 없습니다.");
    if (seller.assignedSeat) throw new Error("이미 자리가 배정된 셀러입니다.");

    const taken = new Set(
      this.data.sellers
        .filter((s) => s.eventId === eventId && s.assignedSeat)
        .map((s) => s.assignedSeat as string),
    );
    const candidates = activeSeatCodes(event).filter((c) => !taken.has(c));
    const res = pickSeat({ candidateCodes: candidates, rand });
    if (!res.seatCode) throw new Error("배정 가능한 좌석이 없습니다.");
    const seatCode = res.seatCode;

    const now = new Date().toISOString();
    const log: DrawLog = {
      id: uid("drw_"),
      eventId,
      sellerId,
      sellerName: `${seller.business} (${seller.name})`,
      seatCode,
      at: now,
      action: "draw",
    };
    this.mutate((d) => ({
      ...d,
      sellers: d.sellers.map((s) =>
        s.id === sellerId ? { ...s, assignedSeat: seatCode, drawnAt: now } : s,
      ),
      draws: [...d.draws, log],
    }));
    return { seatCode };
  }

  /** 수동 재배정 — 대상 좌석이 차 있으면 두 셀러를 맞교환(swap) */
  reassignSeat(eventId: string, sellerId: string, seatCode: string) {
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    const occupant = this.data.sellers.find(
      (s) => s.eventId === eventId && s.assignedSeat === seatCode && s.id !== sellerId,
    );
    const oldSeat = seller.assignedSeat ?? null;
    const now = new Date().toISOString();
    const logs: DrawLog[] = [
      {
        id: uid("drw_"),
        eventId,
        sellerId,
        sellerName: `${seller.business} (${seller.name})`,
        seatCode,
        at: now,
        action: occupant ? "swap" : "reassign",
        note: occupant ? `${occupant.business}와 자리 교환` : `수동 이동 (${oldSeat ?? "미배정"}→${seatCode})`,
      },
    ];
    this.mutate((d) => ({
      ...d,
      sellers: d.sellers.map((s) => {
        if (s.id === sellerId) return { ...s, assignedSeat: seatCode, drawnAt: now };
        if (occupant && s.id === occupant.id) return { ...s, assignedSeat: oldSeat };
        return s;
      }),
      draws: [...d.draws, ...logs],
    }));
  }

  clearAssignment(eventId: string, sellerId: string) {
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    const now = new Date().toISOString();
    this.mutate((d) => ({
      ...d,
      sellers: d.sellers.map((s) => (s.id === sellerId ? { ...s, assignedSeat: null, drawnAt: null } : s)),
      draws: [
        ...d.draws,
        {
          id: uid("drw_"),
          eventId,
          sellerId,
          sellerName: `${seller.business} (${seller.name})`,
          seatCode: seller.assignedSeat ?? null,
          at: now,
          action: "deactivate",
          note: "배정 취소",
        },
      ],
    }));
  }

  setSeatActive(eventId: string, seatCode: string, active: boolean) {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== eventId) return e;
        const set = new Set(e.inactiveSeatCodes);
        if (active) set.delete(seatCode);
        else set.add(seatCode);
        return { ...e, inactiveSeatCodes: [...set] };
      }),
      // 비활성화 시 해당 좌석 배정 셀러 해제
      sellers: active
        ? d.sellers
        : d.sellers.map((s) =>
            s.eventId === eventId && s.assignedSeat === seatCode
              ? { ...s, assignedSeat: null, drawnAt: null }
              : s,
          ),
    }));
  }

  setSeatType(eventId: string, seatCode: string, type: "table" | "wood") {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== eventId) return e;
        const set = new Set(e.woodSeatCodes);
        if (type === "wood") set.add(seatCode);
        else set.delete(seatCode);
        return { ...e, woodSeatCodes: [...set] };
      }),
    }));
  }

  /** 결합석(2매대)을 분리/붙임 토글. 분리 시 배정된 셀러는 해제. */
  setSeatSplit(eventId: string, comboCode: string, split: boolean) {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== eventId) return e;
        const set = new Set(e.splitSeatCodes);
        if (split) set.add(comboCode);
        else set.delete(comboCode);
        return { ...e, splitSeatCodes: [...set] };
      }),
      sellers: d.sellers.map((s) =>
        s.eventId === eventId && s.assignedSeat && comboCodeMatches(comboCode, s.assignedSeat)
          ? { ...s, assignedSeat: null, drawnAt: null }
          : s,
      ),
    }));
  }

  /** 임의 좌석 추가 (지도 탭) */
  addCustomSeat(eventId: string, seat: CustomSeat) {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === eventId ? { ...e, customSeats: [...e.customSeats, seat] } : e,
      ),
    }));
  }

  removeCustomSeat(eventId: string, code: string) {
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) =>
        e.id === eventId ? { ...e, customSeats: e.customSeats.filter((c) => c.code !== code) } : e,
      ),
      sellers: d.sellers.map((s) =>
        s.eventId === eventId && s.assignedSeat === code
          ? { ...s, assignedSeat: null, drawnAt: null }
          : s,
      ),
    }));
  }

  // ---- 메모 ----
  addNote(eventId: string, text: string, tag?: Note["tag"]) {
    if (!text.trim()) return;
    const note: Note = {
      id: uid("note_"),
      eventId,
      text: text.trim(),
      tag,
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.mutate((d) => ({ ...d, notes: [...d.notes, note] }));
  }

  toggleNote(id: string) {
    this.mutate((d) => ({
      ...d,
      notes: d.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
    }));
  }

  removeNote(id: string) {
    this.mutate((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }

  resetDraws(eventId: string) {
    const now = new Date().toISOString();
    this.mutate((d) => ({
      ...d,
      sellers: d.sellers.map((s) =>
        s.eventId === eventId ? { ...s, assignedSeat: null, drawnAt: null } : s,
      ),
      draws: [
        ...d.draws.filter((dr) => dr.eventId !== eventId),
        {
          id: uid("drw_"),
          eventId,
          sellerId: null,
          sellerName: "운영자",
          seatCode: null,
          at: now,
          action: "reset",
          note: "전체 추첨 초기화",
        },
      ],
    }));
  }

  /** 데모용 전체 초기화(시드 재생성) */
  resetAll() {
    this.data = seedData();
    this.persist();
    this.emit();
  }
}

let _store: DataStore | null = null;
export function getStore(): DataStore {
  if (!_store) _store = new DataStore();
  return _store;
}
