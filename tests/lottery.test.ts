import { test } from "node:test";
import assert from "node:assert/strict";
import { pickSeat, activeSeatCodes } from "@/lib/lottery/rules";
import { effectiveSeats, splitParts, isComboSeat } from "@/lib/venue/seats";
import { ALL_SEAT_CODES } from "@/lib/venue/venue-layout";
import type { EventConfig } from "@/lib/data/types";

function evt(over: Partial<EventConfig> = {}): EventConfig {
  return {
    id: "e", date: "2026-07-04", weekday: "토", eventType: "fleamarket",
    name: "t", status: "lottery_open", countWood: 0, countTable: 80, countChair: 80,
    woodSeatCodes: [], inactiveSeatCodes: [], splitSeatCodes: [], customSeats: [],
    ...over,
  };
}

test("pickSeat: 후보 중에서 고르고, 빈 후보면 null", () => {
  const res = pickSeat({ candidateCodes: ALL_SEAT_CODES });
  assert.ok(res.seatCode && ALL_SEAT_CODES.includes(res.seatCode));
  assert.equal(pickSeat({ candidateCodes: [] }).seatCode, null);
});

test("activeSeatCodes: 비활성 좌석 제외", () => {
  const codes = activeSeatCodes(evt({ inactiveSeatCodes: ["1", "2"] }));
  assert.ok(!codes.includes("1") && !codes.includes("2"));
  assert.ok(codes.includes("3"));
});

test("결합석 분리: '8, 8-1' → 단독석 2개로 추첨 풀에 반영", () => {
  const combo = "8, 8-1";
  assert.ok(isComboSeat(combo));
  const merged = activeSeatCodes(evt());
  assert.ok(merged.includes(combo), "기본은 붙임석 1개");
  const split = activeSeatCodes(evt({ splitSeatCodes: [combo] }));
  const [a, b] = splitParts(combo);
  assert.ok(!split.includes(combo) && split.includes(a) && split.includes(b));
  // 좌석 수: 분리 시 +1
  assert.equal(activeSeatCodes(evt({ splitSeatCodes: [combo] })).length, merged.length + 1);
});

test("커스텀 좌석: effectiveSeats/풀에 포함", () => {
  const e = evt({ customSeats: [{ code: "추가1", label: "추가1", x: 10, y: 10, w: 24, h: 22, band: 1, palette: "none" }] });
  assert.ok(effectiveSeats(e).some((s) => s.code === "추가1"));
  assert.ok(activeSeatCodes(e).includes("추가1"));
});
