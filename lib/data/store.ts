"use client";

import type {
  AppData,
  DrawLog,
  DrawResult,
  EventConfig,
  EventType,
  Seller,
  Weekday,
  CustomSeat,
  Note,
  Store,
  SellerImportRow,
} from "./types";
import { categorize } from "@/lib/venue/categories";
import { activeSeatCodes, pickSeat, filterByTwoTables } from "@/lib/lottery/rules";
import {
  STORAGE_KEY,
  CHANNEL,
  uid,
  EMPTY_DATA,
  seedData,
  normalizeData,
  comboCodeMatches,
} from "./seed";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SupabaseStore } from "./supabase-store";

/** 로컬 어댑터: localStorage + BroadcastChannel(탭 간 실시간). 무설정 즉시 실행. */
export class DataStore implements Store {
  private data: AppData = EMPTY_DATA;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? normalizeData(JSON.parse(raw)) : seedData();
      this.persist(false); // 정규화/시드 결과를 다시 저장(구버전 업그레이드)
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
        this.data = normalizeData(JSON.parse(raw));
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
  importSellers(eventId: string, rows: SellerImportRow[]) {
    const sellers: Seller[] = rows.map((r) => ({
      id: uid("sel_"),
      eventId,
      seq: r.seq,
      business: r.business,
      name: r.name,
      productText: r.productText,
      categoryKey: categorize(r.productText),
      twoTables: r.twoTables ?? false,
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

  setSellerTwoTables(sellerId: string, value: boolean) {
    this.mutate((d) => ({
      ...d,
      sellers: d.sellers.map((s) => (s.id === sellerId ? { ...s, twoTables: value } : s)),
    }));
  }

  // ---- lottery ----
  async drawSeat(eventId: string, sellerId: string, rand?: () => number): Promise<DrawResult> {
    const event = this.data.events.find((e) => e.id === eventId);
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!event || !seller) throw new Error("행사 또는 셀러를 찾을 수 없습니다.");
    if (seller.assignedSeat) throw new Error("이미 자리가 배정된 셀러입니다.");

    const taken = new Set(
      this.data.sellers
        .filter((s) => s.eventId === eventId && s.assignedSeat)
        .map((s) => s.assignedSeat as string),
    );
    const candidates = filterByTwoTables(
      activeSeatCodes(event).filter((c) => !taken.has(c)),
      seller.twoTables,
    );
    const res = pickSeat({ candidateCodes: candidates, rand });
    if (!res.seatCode)
      throw new Error(
        seller.twoTables ? "배정 가능한 2매대(붙임석)가 없습니다." : "배정 가능한 좌석이 없습니다.",
      );
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

  /** 여러 좌석 일괄 활성/비활성 (드래그·범위 일괄 제외) */
  setSeatsActive(eventId: string, codes: string[], active: boolean) {
    if (codes.length === 0) return;
    const codeSet = new Set(codes);
    this.mutate((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== eventId) return e;
        const set = new Set(e.inactiveSeatCodes);
        for (const c of codes) (active ? set.delete(c) : set.add(c));
        return { ...e, inactiveSeatCodes: [...set] };
      }),
      sellers: active
        ? d.sellers
        : d.sellers.map((s) =>
            s.eventId === eventId && s.assignedSeat && codeSet.has(s.assignedSeat)
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

let _store: Store | null = null;
/** 환경에 Supabase 키가 있으면 Supabase 어댑터, 없으면 로컬 어댑터. */
export function getStore(): Store {
  if (!_store) _store = isSupabaseConfigured() ? new SupabaseStore() : new DataStore();
  return _store;
}
