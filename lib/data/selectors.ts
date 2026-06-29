import type { EventConfig, Seller, SeatCellState } from "./types";
import { effectiveSeats } from "@/lib/venue/seats";

/** event + sellers → SeatMap 렌더용 좌석 상태 맵 (결합석 분리·커스텀 좌석 반영) */
export function buildSeatStates(
  event: EventConfig | undefined,
  sellers: Seller[],
): Record<string, SeatCellState> {
  const out: Record<string, SeatCellState> = {};
  const inactive = new Set(event?.inactiveSeatCodes ?? []);
  const wood = new Set(event?.woodSeatCodes ?? []);
  const bySeat = new Map<string, Seller>();
  for (const s of sellers) if (s.assignedSeat) bySeat.set(s.assignedSeat, s);

  for (const seat of effectiveSeats(event)) {
    const occupant = bySeat.get(seat.code);
    out[seat.code] = {
      status: inactive.has(seat.code) ? "inactive" : occupant ? "assigned" : "empty",
      type: wood.has(seat.code) ? "wood" : "table",
      occupant: occupant
        ? {
            name: occupant.name,
            business: occupant.business,
            categoryKey: occupant.categoryKey,
          }
        : undefined,
    };
  }
  return out;
}

/** 이름/상호/전화번호로 셀러 검색 */
export function searchSellers(sellers: Seller[], query: string): Seller[] {
  const q = query.trim().toLowerCase().replace(/\s/g, "");
  if (!q) return [];
  return sellers.filter((s) => {
    const hay = `${s.name}${s.business}${s.phone ?? ""}`.toLowerCase().replace(/\s/g, "");
    return hay.includes(q);
  });
}

export function lotteryProgress(sellers: Seller[]): { drawn: number; total: number } {
  return {
    drawn: sellers.filter((s) => s.assignedSeat).length,
    total: sellers.length,
  };
}
