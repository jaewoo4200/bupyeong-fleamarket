"use client";

import type {
  AppData,
  CustomSeat,
  DrawResult,
  EventConfig,
  EventType,
  Note,
  Seller,
  SellerImportRow,
  Store,
  Weekday,
} from "./types";
import { categorize } from "@/lib/venue/categories";
import { activeSeatCodes, filterByTwoTables } from "@/lib/lottery/rules";
import { splitParts } from "@/lib/venue/seats";
import { EMPTY_DATA } from "./seed";
import { SEED_SELLERS } from "./seed-sellers";
import { getSupabaseClient } from "@/lib/supabase/client";

const CURRENT_KEY = "bupyeong-flea/current-event";

/* ── snake_case(row) → camelCase(app) 매핑 ── */
type Row = Record<string, unknown>;
function mapEvent(r: Row): EventConfig {
  return {
    id: r.id as string,
    date: r.date as string,
    weekday: r.weekday as Weekday,
    eventType: r.event_type as EventType,
    name: r.name as string,
    status: r.status as EventConfig["status"],
    countWood: (r.count_wood as number) ?? 0,
    countTable: (r.count_table as number) ?? 80,
    countChair: (r.count_chair as number) ?? 80,
    woodSeatCodes: (r.wood_seat_codes as string[]) ?? [],
    inactiveSeatCodes: (r.inactive_seat_codes as string[]) ?? [],
    splitSeatCodes: (r.split_seat_codes as string[]) ?? [],
    customSeats: (r.custom_seats as CustomSeat[]) ?? [],
  };
}
function mapSeller(r: Row): Seller {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    seq: (r.seq as number) ?? 0,
    business: (r.business as string) ?? "",
    name: (r.name as string) ?? "",
    productText: (r.product_text as string) ?? "",
    categoryKey: (r.category_key as Seller["categoryKey"]) ?? "etc",
    twoTables: Boolean(r.two_tables),
    phone: (r.phone as string) ?? undefined,
    assignedSeat: (r.assigned_seat as string) ?? null,
    drawnAt: (r.drawn_at as string) ?? null,
  };
}
function mapDraw(r: Row) {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    sellerId: (r.seller_id as string) ?? null,
    sellerName: (r.seller_name as string) ?? "",
    seatCode: (r.seat_code as string) ?? null,
    at: r.at as string,
    action: r.action as AppData["draws"][number]["action"],
    note: (r.note as string) ?? undefined,
  };
}
function mapNote(r: Row): Note {
  return {
    id: r.id as string,
    eventId: r.event_id as string,
    text: r.text as string,
    tag: (r.tag as Note["tag"]) ?? undefined,
    done: Boolean(r.done),
    createdAt: r.created_at as string,
  };
}

/** Supabase 어댑터: Postgres + Realtime. 인메모리 미러를 유지하고 변경 시 reload. */
export class SupabaseStore implements Store {
  private data: AppData = EMPTY_DATA;
  private listeners = new Set<() => void>();
  private initialized = false;
  private currentEventId: string | undefined;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  private sb() {
    return getSupabaseClient();
  }

  private async init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.currentEventId = localStorage.getItem(CURRENT_KEY) ?? undefined;
    try {
      await this.load();
      if (this.data.events.length === 0) {
        await this.autoSeed();
        await this.load();
      }
      this.subscribeRealtime();
    } catch (e) {
      console.warn("[supabase] 초기화 실패:", e);
    }
  }

  private async load() {
    const sb = this.sb();
    const [ev, sel, dr, nt] = await Promise.all([
      sb.from("events").select("*"),
      sb.from("sellers").select("*"),
      sb.from("draws").select("*"),
      sb.from("notes").select("*"),
    ]);
    if (ev.error) {
      // 마이그레이션 미적용 등 — 크래시 대신 빈 상태 유지
      console.warn("[supabase] 로드 실패 (마이그레이션 적용 여부 확인):", ev.error.message);
      return;
    }
    const events = (ev.data ?? []).map(mapEvent).sort((a, b) => a.date.localeCompare(b.date));
    const sellers = (sel.data ?? []).map(mapSeller);
    const draws = (dr.data ?? []).map(mapDraw);
    const notes = (nt.data ?? []).map(mapNote);
    const currentEventId =
      this.currentEventId && events.some((e) => e.id === this.currentEventId)
        ? this.currentEventId
        : events[0]?.id;
    this.currentEventId = currentEventId;
    this.data = { events, sellers, draws, notes, currentEventId };
    this.emit();
  }

  private async autoSeed() {
    const sb = this.sb();
    const defs: [string, Weekday, string][] = [
      ["2026-07-04", "토", "2026-07-04 (토) 플리마켓"],
      ["2026-06-07", "일", "2026-06-07 (일) 플리마켓"],
    ];
    for (const [date, weekday, name] of defs) {
      const { data: ev } = await sb
        .from("events")
        .insert({ date, weekday, event_type: "fleamarket", name, status: "lottery_open", count_wood: 8, count_table: 72, count_chair: 80 })
        .select()
        .single();
      if (!ev) continue;
      await sb.from("sellers").insert(
        SEED_SELLERS.map((s) => ({
          event_id: ev.id,
          seq: s.seq,
          business: s.business,
          name: s.name,
          product_text: s.productText,
          category_key: categorize(s.productText),
          two_tables: s.seq === 3 || s.seq === 38, // 데모 2매대 셀러
        })),
      );
      if (date === "2026-07-04") {
        await sb.from("notes").insert([
          { event_id: ev.id, text: "57~59 구간 의자 2개 추가 요청 (셀러 만달)", tag: "chair" },
          { event_id: ev.id, text: "분수대 쪽 하수구 덮개 점검 필요", tag: "facility" },
        ]);
      }
    }
  }

  private subscribeRealtime() {
    const sb = this.sb();
    const ch = sb.channel("bupyeong-rt");
    for (const table of ["events", "sellers", "draws", "notes"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => this.scheduleReload());
    }
    ch.subscribe();
  }

  private scheduleReload() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void this.load(), 150);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  // ── external store ──
  subscribe = (cb: () => void) => {
    void this.init();
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getSnapshot = (): AppData => this.data;
  getServerSnapshot = (): AppData => EMPTY_DATA;

  // ── events ──
  async createEvent(input: { date: string; weekday: Weekday; eventType: EventType; name?: string }) {
    const name =
      input.name || `${input.date} (${input.weekday}) ${input.eventType === "bbday" ? "비비데이" : "플리마켓"}`;
    const { data } = await this.sb()
      .from("events")
      .insert({ date: input.date, weekday: input.weekday, event_type: input.eventType, name, status: "draft", count_wood: 0, count_table: 80, count_chair: 80 })
      .select()
      .single();
    if (data?.id) {
      this.currentEventId = data.id as string;
      localStorage.setItem(CURRENT_KEY, this.currentEventId);
    }
    await this.load();
  }

  async updateEvent(id: string, patch: Partial<EventConfig>) {
    const u: Row = {};
    const m: Record<string, string> = {
      name: "name", date: "date", weekday: "weekday", eventType: "event_type", status: "status",
      countWood: "count_wood", countTable: "count_table", countChair: "count_chair",
      woodSeatCodes: "wood_seat_codes", inactiveSeatCodes: "inactive_seat_codes",
      splitSeatCodes: "split_seat_codes", customSeats: "custom_seats",
    };
    for (const [k, col] of Object.entries(m)) {
      const v = (patch as Record<string, unknown>)[k];
      if (v !== undefined) u[col] = v;
    }
    if (Object.keys(u).length) await this.sb().from("events").update(u).eq("id", id);
    await this.load();
  }

  setCurrentEvent(id: string) {
    this.currentEventId = id;
    if (typeof window !== "undefined") localStorage.setItem(CURRENT_KEY, id);
    this.data = { ...this.data, currentEventId: id };
    this.emit();
  }

  // ── sellers ──
  async importSellers(eventId: string, rows: SellerImportRow[]) {
    const sb = this.sb();
    await sb.from("sellers").delete().eq("event_id", eventId);
    await sb.from("draws").delete().eq("event_id", eventId);
    await sb.from("sellers").insert(
      rows.map((r) => ({
        event_id: eventId,
        seq: r.seq,
        business: r.business,
        name: r.name,
        product_text: r.productText,
        category_key: categorize(r.productText),
        two_tables: r.twoTables ?? false,
        phone: r.phone ?? null,
      })),
    );
    await this.load();
  }

  async setSellerTwoTables(sellerId: string, value: boolean) {
    await this.sb().from("sellers").update({ two_tables: value }).eq("id", sellerId);
    await this.load();
  }

  // ── lottery ──
  async drawSeat(eventId: string, sellerId: string): Promise<DrawResult> {
    const event = this.data.events.find((e) => e.id === eventId);
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!event || !seller) throw new Error("행사 또는 셀러를 찾을 수 없습니다.");
    if (seller.assignedSeat) throw new Error("이미 자리가 배정된 셀러입니다.");

    const taken = new Set(
      this.data.sellers.filter((s) => s.eventId === eventId && s.assignedSeat).map((s) => s.assignedSeat as string),
    );
    let candidates = filterByTwoTables(
      activeSeatCodes(event).filter((c) => !taken.has(c)),
      seller.twoTables,
    );
    const sb = this.sb();
    while (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const { data, error } = await sb.rpc("claim_seat", { p_event: eventId, p_seller: sellerId, p_seat: pick });
      if (error) throw new Error(error.message);
      if (data === "OK") {
        await this.load();
        return { seatCode: pick };
      }
      if (data === "ALREADY") throw new Error("이미 자리가 배정된 셀러입니다.");
      candidates = candidates.filter((c) => c !== pick); // TAKEN → 재시도
    }
    throw new Error(
      seller.twoTables ? "배정 가능한 2매대(붙임석)가 없습니다." : "배정 가능한 좌석이 없습니다.",
    );
  }

  async reassignSeat(eventId: string, sellerId: string, seatCode: string) {
    const sb = this.sb();
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    const occupant = this.data.sellers.find(
      (s) => s.eventId === eventId && s.assignedSeat === seatCode && s.id !== sellerId,
    );
    const oldSeat = seller.assignedSeat ?? null;
    const now = new Date().toISOString();
    await sb.from("sellers").update({ assigned_seat: seatCode, drawn_at: now }).eq("id", sellerId);
    if (occupant) await sb.from("sellers").update({ assigned_seat: oldSeat }).eq("id", occupant.id);
    await sb.from("draws").insert({
      event_id: eventId,
      seller_id: sellerId,
      seller_name: `${seller.business} (${seller.name})`,
      seat_code: seatCode,
      action: occupant ? "swap" : "reassign",
      note: occupant ? `${occupant.business}와 자리 교환` : `수동 이동 (${oldSeat ?? "미배정"}→${seatCode})`,
    });
    await this.load();
  }

  async clearAssignment(eventId: string, sellerId: string) {
    const sb = this.sb();
    const seller = this.data.sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    await sb.from("sellers").update({ assigned_seat: null, drawn_at: null }).eq("id", sellerId);
    await sb.from("draws").insert({
      event_id: eventId,
      seller_id: sellerId,
      seller_name: `${seller.business} (${seller.name})`,
      seat_code: seller.assignedSeat ?? null,
      action: "deactivate",
      note: "배정 취소",
    });
    await this.load();
  }

  async setSeatActive(eventId: string, seatCode: string, active: boolean) {
    const sb = this.sb();
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    const set = new Set(ev.inactiveSeatCodes);
    if (active) set.delete(seatCode);
    else set.add(seatCode);
    await sb.from("events").update({ inactive_seat_codes: [...set] }).eq("id", eventId);
    if (!active)
      await sb.from("sellers").update({ assigned_seat: null, drawn_at: null }).eq("event_id", eventId).eq("assigned_seat", seatCode);
    await this.load();
  }

  async setSeatsActive(eventId: string, codes: string[], active: boolean) {
    if (codes.length === 0) return;
    const sb = this.sb();
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    const set = new Set(ev.inactiveSeatCodes);
    for (const c of codes) active ? set.delete(c) : set.add(c);
    await sb.from("events").update({ inactive_seat_codes: [...set] }).eq("id", eventId);
    if (!active)
      await sb.from("sellers").update({ assigned_seat: null, drawn_at: null }).eq("event_id", eventId).in("assigned_seat", codes);
    await this.load();
  }

  async setSeatType(eventId: string, seatCode: string, type: "table" | "wood") {
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    const set = new Set(ev.woodSeatCodes);
    if (type === "wood") set.add(seatCode);
    else set.delete(seatCode);
    await this.sb().from("events").update({ wood_seat_codes: [...set] }).eq("id", eventId);
    await this.load();
  }

  async setSeatSplit(eventId: string, comboCode: string, split: boolean) {
    const sb = this.sb();
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    const set = new Set(ev.splitSeatCodes);
    if (split) set.add(comboCode);
    else set.delete(comboCode);
    await sb.from("events").update({ split_seat_codes: [...set] }).eq("id", eventId);
    await sb
      .from("sellers")
      .update({ assigned_seat: null, drawn_at: null })
      .eq("event_id", eventId)
      .in("assigned_seat", [comboCode, ...splitParts(comboCode)]);
    await this.load();
  }

  async addCustomSeat(eventId: string, seat: CustomSeat) {
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    await this.sb().from("events").update({ custom_seats: [...ev.customSeats, seat] }).eq("id", eventId);
    await this.load();
  }

  async removeCustomSeat(eventId: string, code: string) {
    const sb = this.sb();
    const ev = this.data.events.find((e) => e.id === eventId);
    if (!ev) return;
    await sb.from("events").update({ custom_seats: ev.customSeats.filter((c) => c.code !== code) }).eq("id", eventId);
    await sb.from("sellers").update({ assigned_seat: null, drawn_at: null }).eq("event_id", eventId).eq("assigned_seat", code);
    await this.load();
  }

  // ── notes ──
  async addNote(eventId: string, text: string, tag?: Note["tag"]) {
    if (!text.trim()) return;
    await this.sb().from("notes").insert({ event_id: eventId, text: text.trim(), tag: tag ?? null, done: false });
    await this.load();
  }

  async toggleNote(id: string) {
    const note = this.data.notes.find((n) => n.id === id);
    if (!note) return;
    await this.sb().from("notes").update({ done: !note.done }).eq("id", id);
    await this.load();
  }

  async removeNote(id: string) {
    await this.sb().from("notes").delete().eq("id", id);
    await this.load();
  }

  async resetDraws(eventId: string) {
    const sb = this.sb();
    await sb.from("sellers").update({ assigned_seat: null, drawn_at: null }).eq("event_id", eventId);
    await sb.from("draws").delete().eq("event_id", eventId);
    await sb.from("draws").insert({ event_id: eventId, seller_id: null, seller_name: "운영자", seat_code: null, action: "reset", note: "전체 추첨 초기화" });
    await this.load();
  }

  async resetAll() {
    // events 삭제 → FK cascade로 sellers/draws/notes 동반 삭제 → 재시드
    await this.sb().from("events").delete().not("id", "is", null);
    await this.autoSeed();
    await this.load();
  }
}
